#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { Command } from 'commander';
import chalk from 'chalk';
import { UserSeeder } from './generators/users';
import { ContentSeeder } from './generators/content';
import { PaymentSeeder } from './generators/payments';
import { SocialSeeder } from './generators/social';
import { BlogSeeder } from './generators/blogs';
import { DatabaseInserter } from './database/inserter';

const program = new Command();

// 數據庫配置
const getDataSource = (): DataSource => {
  return new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'suggar_daddy',
    synchronize: false,
    logging: false,
  });
};

// 顯示標題
const showBanner = () => {
  console.log(chalk.cyan('╔════════════════════════════════════╗'));
  console.log(chalk.cyan('║     🌟  Sugar-Daddy Seed Data      ║'));
  console.log(chalk.cyan('║        Rich Data Generator         ║'));
  console.log(chalk.cyan('╚════════════════════════════════════╝\n'));
};

// 顯示摘要
const showSummary = (data: any) => {
  console.log(chalk.green('\n✅ Seed 數據生成完成！\n'));
  
  console.log(chalk.yellow('📊 數據統計：'));
  console.log(chalk.gray('─'.repeat(40)));
  
  if (data.users?.length) {
    console.log(chalk.cyan('\n👥 用戶：'));
    console.log(`  總用戶: ${data.users.length}`);
    console.log(`  Sugar Babies: ${data.users.filter((u: any) => u.userType === 'sugar_baby').length}`);
    console.log(`  Sugar Daddies: ${data.users.filter((u: any) => u.userType === 'sugar_daddy').length}`);
    console.log(`  創作者: ${data.users.filter((u: any) => u.permissionRole === 'creator').length}`);
  }

  if (data.posts?.length) {
    console.log(chalk.cyan('\n📝 內容：'));
    console.log(`  貼文: ${data.posts.length}`);
    console.log(`  限時動態: ${data.stories?.length ?? 0}`);
    console.log(`  讚: ${data.postLikes?.length ?? 0}`);
    console.log(`  評論: ${data.postComments?.length ?? 0}`);
  }

  if (data.subscriptions?.length) {
    console.log(chalk.cyan('\n💰 支付：'));
    console.log(`  訂閱: ${data.subscriptions.length}`);
    console.log(`  交易: ${data.transactions?.length ?? 0}`);
    console.log(`  打賞: ${data.tips?.length ?? 0}`);
  }

  if (data.follows?.length) {
    console.log(chalk.cyan('\n💘 社交：'));
    console.log(`  追蹤: ${data.follows.length}`);
    console.log(`  滑動: ${data.swipes?.length ?? 0}`);
    console.log(`  配對: ${data.matches?.length ?? 0}`);
  }

  if (data.blogs?.length) {
    console.log(chalk.cyan('\n📰 部落格：'));
    console.log(`  文章: ${data.blogs.length}`);
  }

  console.log(chalk.gray('─'.repeat(40)));

  if (data.users?.length) {
    console.log(chalk.yellow('\n🔑 測試帳號：'));
    console.log('  管理員: admin@suggar-daddy.com / Test1234!');
    console.log('  創作者: creator1@test.com / Test1234!');
    console.log('  訂閱者: subscriber1@test.com / Test1234!');
    console.log(`  其他: baby1-${data.users.filter((u: any) => u.userType === 'sugar_baby').length}@test.com / Test1234!`);
    console.log(`        daddy1-${data.users.filter((u: any) => u.userType === 'sugar_daddy').length}@test.com / Test1234!`);
  }
  
  console.log(chalk.green('\n🎉 所有數據已插入數據庫！\n'));
};

// 生成所有數據
const generateAllData = async (options: any) => {
  showBanner();
  
  const dataSource = getDataSource();
  
  try {
    // 連接數據庫
    console.log(chalk.blue('🔗 連接數據庫...'));
    await dataSource.initialize();
    console.log(chalk.green('✓ 數據庫連接成功\n'));
    
    const inserter = new DatabaseInserter(dataSource);
    
    // 如果需要清除數據
    if (options.clear) {
      await inserter.clearAllData();
    }
    
    const generatedData: any = {};
    
    // 1. 生成用戶數據
    if (!options.module || options.module === 'users' || options.module === 'all') {
      console.log(chalk.blue('🚀 開始生成用戶數據...\n'));
      
      const userSeeder = new UserSeeder();
      await userSeeder.initialize();
      
      generatedData.skills = userSeeder.generateSkills();
      generatedData.users = userSeeder.generateUsers();
      generatedData.userSkills = userSeeder.generateUserSkills();
      
      // 插入數據庫
      await inserter.insertSkills(generatedData.skills);
      await inserter.insertUsers(generatedData.users);
      await inserter.insertUserSkills(generatedData.userSkills);
      
      // 保存供其他模組使用
      const creators = userSeeder.getCreators();
      const subscribers = userSeeder.getSubscribers();
      
      // 2. 生成內容數據
      if (options.module === 'all' || !options.module) {
        console.log(chalk.blue('\n🚀 開始生成內容數據...\n'));
        
        const contentSeeder = new ContentSeeder();
        generatedData.posts = contentSeeder.generatePosts(creators);
        generatedData.stories = contentSeeder.generateStories(creators);
        
        // 先插入內容
        await inserter.insertPosts(generatedData.posts);
        await inserter.insertStories(generatedData.stories);
        
        // 生成互動數據
        const { likes, comments, bookmarks } = contentSeeder.generateInteractions(generatedData.users);
        generatedData.postLikes = likes;
        generatedData.postComments = comments;
        generatedData.bookmarks = bookmarks;
        
        await inserter.insertPostLikes(likes);
        await inserter.insertPostComments(comments);
        await inserter.insertBookmarks(bookmarks);
      }
      
      // 3. 生成支付數據
      if (options.module === 'all' || options.module === 'payments' || !options.module) {
        console.log(chalk.blue('\n🚀 開始生成支付數據...\n'));
        
        const paymentSeeder = new PaymentSeeder();
        generatedData.subscriptionTiers = paymentSeeder.generateSubscriptionTiers(creators);
        await inserter.insertSubscriptionTiers(generatedData.subscriptionTiers);
        
        generatedData.subscriptions = paymentSeeder.generateSubscriptions(
          subscribers,
          creators,
          generatedData.subscriptionTiers
        );
        await inserter.insertSubscriptions(generatedData.subscriptions);
        
        generatedData.transactions = paymentSeeder.generateTransactions(
          generatedData.users,
          generatedData.subscriptions
        );
        await inserter.insertTransactions(generatedData.transactions);
        
        generatedData.tips = paymentSeeder.generateTips(generatedData.users, creators);
        await inserter.insertTips(generatedData.tips);
        
        generatedData.dmPurchases = paymentSeeder.generateDMPurchases(subscribers, creators);
        await inserter.insertDMPurchases(generatedData.dmPurchases);
      }
      
      // 4. 生成社交數據
      if (options.module === 'all' || options.module === 'social' || !options.module) {
        console.log(chalk.blue('\n🚀 開始生成社交數據...\n'));

        const socialSeeder = new SocialSeeder();
        generatedData.follows = socialSeeder.generateFollows(generatedData.users);
        await inserter.insertFollows(generatedData.follows);

        const { swipes, matches } = socialSeeder.generateSwipesAndMatches(generatedData.users);
        generatedData.swipes = swipes;
        generatedData.matches = matches;

        await inserter.insertSwipes(swipes);
        await inserter.insertMatches(matches);
      }
    }

    // 5. 生成部落格文章（不依賴用戶模組）
    if (!options.module || options.module === 'all' || options.module === 'blogs') {
      console.log(chalk.blue('\n🚀 開始生成部落格文章...\n'));

      const blogSeeder = new BlogSeeder();
      generatedData.blogs = blogSeeder.generateBlogs();
      await inserter.insertBlogs(generatedData.blogs);
    }

    // 顯示摘要
    showSummary(generatedData);
    
  } catch (error) {
    console.error(chalk.red('\n❌ 錯誤:'), error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
};

// CLI 配置
program
  .name('seed-data')
  .description('Sugar-Daddy Rich Seed Data Generator')
  .version('1.0.0');

program
  .option('-m, --module <module>', '指定生成模組 (users, content, payments, social, all)', 'all')
  .option('-c, --clear', '清除現有數據後再生成', false)
  .option('-u, --users <count>', '用戶數量', '100')
  .action(generateAllData);

program.parse();
