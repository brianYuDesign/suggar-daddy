import json
import logging
import threading
from typing import Optional

from confluent_kafka import Consumer, KafkaError

from .config import settings
from .engine import update_single_embedding

logger = logging.getLogger(__name__)

_consumer_thread: Optional[threading.Thread] = None
_running = False

# Topics matching NestJS Kafka event definitions
TOPIC_BEHAVIOR_BATCH = "behavior.batch"
TOPIC_SWIPE = "matching.swipe"
TOPIC_PROFILE_UPDATE = "user.profile.updated"


def _create_consumer() -> Consumer:
    return Consumer({
        "bootstrap.servers": settings.kafka_bootstrap_servers,
        "group.id": "recommendation-ml-consumer",
        "auto.offset.reset": "latest",
        "enable.auto.commit": True,
        "session.timeout.ms": 30000,
        "max.poll.interval.ms": 300000,
    })


def _process_message(topic: str, value: dict):
    """Process a single Kafka message."""
    try:
        if topic == TOPIC_BEHAVIOR_BATCH:
            # Batch of behavior events — update embeddings for involved users
            events = value.get("events", [])
            user_ids = set()
            for evt in events:
                uid = evt.get("userId")
                tid = evt.get("targetUserId")
                if uid:
                    user_ids.add(uid)
                if tid:
                    user_ids.add(tid)
            for uid in user_ids:
                update_single_embedding(uid)
            if user_ids:
                logger.debug(f"Updated embeddings for {len(user_ids)} users from behavior batch")

        elif topic == TOPIC_SWIPE:
            # Swipe event — update both users' embeddings
            swiper = value.get("swiperId") or value.get("userId")
            swiped = value.get("swipedId") or value.get("targetUserId")
            if swiper:
                update_single_embedding(swiper)
            if swiped:
                update_single_embedding(swiped)

        elif topic == TOPIC_PROFILE_UPDATE:
            # Profile update — update user's explicit features
            uid = value.get("userId") or value.get("id")
            if uid:
                update_single_embedding(uid)

    except Exception as e:
        logger.error(f"Error processing {topic} message: {e}")


def _consumer_loop():
    """Main consumer loop running in a background thread."""
    global _running
    consumer = _create_consumer()
    topics = [TOPIC_BEHAVIOR_BATCH, TOPIC_SWIPE, TOPIC_PROFILE_UPDATE]
    consumer.subscribe(topics)
    logger.info(f"Kafka consumer subscribed to: {topics}")

    while _running:
        try:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                logger.error(f"Kafka consumer error: {msg.error()}")
                continue

            topic = msg.topic()
            try:
                value = json.loads(msg.value().decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                logger.warning(f"Failed to decode message from {topic}: {e}")
                continue

            _process_message(topic, value)

        except Exception as e:
            logger.error(f"Kafka consumer loop error: {e}")

    consumer.close()
    logger.info("Kafka consumer stopped")


def start_consumer():
    """Start the Kafka consumer in a background thread."""
    global _consumer_thread, _running
    if _running:
        return
    _running = True
    _consumer_thread = threading.Thread(target=_consumer_loop, daemon=True, name="kafka-consumer")
    _consumer_thread.start()
    logger.info("Kafka consumer thread started")


def stop_consumer():
    """Stop the Kafka consumer."""
    global _running
    _running = False
    if _consumer_thread and _consumer_thread.is_alive():
        _consumer_thread.join(timeout=5)
    logger.info("Kafka consumer thread stopped")
