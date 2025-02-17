import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('header').remove();
    $('footer').remove();
    $('iframe').remove();
    $('.advertisement').remove();
    $('[class*="ad-"]').remove();
    $('[id*="ad-"]').remove();

    // Extract the main content
    let content = '';
    
    // Try common article content selectors
    const contentSelectors = [
      'article',
      '[class*="article-content"]',
      '[class*="article-body"]',
      '[class*="story-content"]',
      '[class*="story-body"]',
      'main',
      '.post-content',
      '.entry-content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        break;
      }
    }

    // If no content found with selectors, try paragraphs
    if (!content) {
      content = $('p')
        .map(function() {
          return $(this).text().trim();
        })
        .get()
        .filter(text => text.length > 100)
        .join('\n\n');
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    if (!content) {
      throw new Error('Could not extract article content');
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article content' },
      { status: 500 }
    );
  }
} 