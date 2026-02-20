import CreatorProfile from '@/components/creator/CreatorProfile';

export default function CreatorPage({ params }: { params: { id: string } }) {
  return <CreatorProfile creatorId={params.id} />;
}
