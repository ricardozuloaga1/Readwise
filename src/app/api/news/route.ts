import { NextResponse } from 'next/server';
import { NewsResponse, NewsArticle } from '@/lib/types/news';

const CATEGORIES = {
  general: 'General',
  business: 'Business',
  technology: 'Technology',
  science: 'Science',
  health: 'Health'
} as const;

type Category = keyof typeof CATEGORIES;

async function fetchNewsAPI(category: Category = 'general') {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error('NEWS_API_KEY is not defined');
  }

  const response = await fetch(
    `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=10&apiKey=${apiKey}`,
    { next: { revalidate: 300 } }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch from NewsAPI');
  }

  const data = await response.json();
  return {
    articles: data.articles.map((article: any) => ({
      ...article,
      source: {
        id: article.source?.id || 'newsapi',
        name: article.source?.name || 'News API'
      },
      category
    }))
  };
}

async function fetchGuardian(category: Category = 'general') {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) {
    return null;
  }

  // Map our categories to Guardian sections
  const sectionMap: Record<Category, string> = {
    general: 'news',
    business: 'business',
    technology: 'technology',
    science: 'science',
    health: 'healthcare'
  };

  const section = sectionMap[category];
  const response = await fetch(
    `https://content.guardianapis.com/search?api-key=${apiKey}&section=${section}&show-fields=thumbnail,bodyText,byline&page-size=10&order-by=newest`,
    { next: { revalidate: 300 } }
  );

  if (!response.ok) {
    console.error('Failed to fetch from Guardian');
    return null;
  }

  const data = await response.json();
  
  return {
    articles: data.response.results.map((article: any) => ({
      source: { id: 'guardian', name: 'The Guardian' },
      author: article.fields?.byline || null,
      title: article.webTitle,
      description: article.fields?.bodyText?.substring(0, 200) + '...',
      url: article.webUrl,
      urlToImage: article.fields?.thumbnail || null,
      publishedAt: article.webPublicationDate,
      content: article.fields?.bodyText || article.webTitle,
      category
    }))
  };
}

async function fetchMediaStack(category: Category = 'general') {
  const apiKey = process.env.MEDIASTACK_API_KEY;
  if (!apiKey) {
    return null;
  }

  // Map our categories to MediaStack categories
  const categoryMap: Record<Category, string> = {
    general: 'general',
    business: 'business',
    technology: 'technology',
    science: 'science',
    health: 'health'
  };

  const response = await fetch(
    `http://api.mediastack.com/v1/news?access_key=${apiKey}&countries=us&categories=${categoryMap[category]}&limit=10&sort=published_desc`,
    { next: { revalidate: 300 } }
  );

  if (!response.ok) {
    console.error('Failed to fetch from MediaStack');
    return null;
  }

  const data = await response.json();
  
  return {
    articles: data.data.map((article: any) => ({
      source: { 
        id: 'mediastack', 
        name: article.source || 'MediaStack'
      },
      author: null,
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.image,
      publishedAt: article.published_at,
      content: article.description,
      category
    })).filter((article: any) => 
      article.title && 
      article.description && 
      article.url && 
      !article.title.includes('[Removed]')
    )
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || 'general') as Category;

    if (!Object.keys(CATEGORIES).includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    console.log('Fetching news from all sources for category:', category);
    
    const [newsAPIResponse, guardianResponse, mediaStackResponse] = await Promise.all([
      fetchNewsAPI(category).catch(error => {
        console.error('NewsAPI Error:', error);
        return null;
      }),
      fetchGuardian(category).catch(error => {
        console.error('Guardian Error:', error);
        return null;
      }),
      fetchMediaStack(category).catch(error => {
        console.error('MediaStack Error:', error);
        return null;
      })
    ]);

    console.log('Articles fetched:', {
      newsAPI: newsAPIResponse?.articles?.length || 0,
      guardian: guardianResponse?.articles?.length || 0,
      mediaStack: mediaStackResponse?.articles?.length || 0
    });

    const allArticles = [
      ...(newsAPIResponse?.articles || []),
      ...(guardianResponse?.articles || []),
      ...(mediaStackResponse?.articles || [])
    ].filter(article => 
      article.title && 
      article.description && 
      article.url &&
      article.publishedAt
    );

    const uniqueArticles = allArticles.reduce((acc: NewsArticle[], current) => {
      const isDuplicate = acc.some(article => 
        article.url === current.url ||
        article.title.toLowerCase().includes(current.title.toLowerCase()) ||
        current.title.toLowerCase().includes(article.title.toLowerCase())
      );
      if (!isDuplicate) {
        acc.push({
          ...current,
          publishedAt: new Date(current.publishedAt).toISOString(),
          description: current.description?.slice(0, 300) + '...',
          source: {
            id: current.source?.id || 'unknown',
            name: current.source?.name || 'News Source'
          },
          category: current.category || category
        });
      }
      return acc;
    }, []);

    uniqueArticles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    console.log('Total unique articles:', uniqueArticles.length);

    return NextResponse.json({
      status: 'ok',
      totalResults: uniqueArticles.length,
      articles: uniqueArticles,
      categories: CATEGORIES
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
} 