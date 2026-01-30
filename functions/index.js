// Firebase Cloud Functions for BGG API Proxy
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { parseStringPromise } from 'xml2js';
import fetch from 'node-fetch';

const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2';

// BGG API Bearer Token - set via Firebase secrets or environment
// To set: firebase functions:secrets:set BGG_API_TOKEN
const bggApiToken = defineSecret('BGG_API_TOKEN');

// Helper to get BGG fetch headers
function getBggHeaders() {
  const token = process.env.BGG_API_TOKEN;
  const headers = {
    'User-Agent': 'FamilyGameLibrary/1.0',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper to send JSON response with CORS headers
function sendJson(res, data, status = 200) {
  res.set(corsHeaders);
  res.status(status).json(data);
}

// Helper to send error response
function sendError(res, message, status = 500) {
  sendJson(res, { error: message }, status);
}

// Search for games by name
export const bggSearch = onRequest({ secrets: [bggApiToken] }, async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set(corsHeaders);
    res.status(204).send('');
    return;
  }

  const query = req.query.q;
  if (!query || typeof query !== 'string') {
    sendError(res, 'Missing search query parameter "q"', 400);
    return;
  }

  try {
    const url = `${BGG_API_BASE}/search?query=${encodeURIComponent(query)}&type=boardgame`;
    const response = await fetch(url, { headers: getBggHeaders() });

    if (!response.ok) {
      if (response.status === 401) {
        sendError(res, 'BGG API authentication required. Please configure BGG_API_TOKEN.', 401);
      } else {
        sendError(res, `BGG API request failed with status ${response.status}`, response.status);
      }
      return;
    }

    const xml = await response.text();
    const result = await parseStringPromise(xml, { explicitArray: false });

    // Handle empty results
    if (!result.items || !result.items.item) {
      sendJson(res, { results: [] });
      return;
    }

    // Normalize to array (single result comes as object)
    const items = Array.isArray(result.items.item)
      ? result.items.item
      : [result.items.item];

    // Get first 10 results
    const limitedItems = items.slice(0, 10);

    // Map basic info
    let results = limitedItems.map((item) => ({
      bggId: item.$.id,
      name: item.name?.$.value || 'Unknown',
      yearPublished: item.yearpublished?.$.value
        ? parseInt(item.yearpublished.$.value, 10)
        : undefined,
      thumbnail: undefined,
    }));

    // Batch fetch thumbnails for all results (BGG supports multiple IDs)
    const ids = results.map((r) => r.bggId).join(',');
    try {
      const thumbUrl = `${BGG_API_BASE}/thing?id=${ids}&type=boardgame`;
      const thumbResponse = await fetch(thumbUrl, { headers: getBggHeaders() });

      if (thumbResponse.ok) {
        const thumbXml = await thumbResponse.text();
        const thumbResult = await parseStringPromise(thumbXml, { explicitArray: false });

        if (thumbResult.items?.item) {
          const thumbItems = Array.isArray(thumbResult.items.item)
            ? thumbResult.items.item
            : [thumbResult.items.item];

          // Create a map of id -> thumbnail
          const thumbMap = {};
          for (const item of thumbItems) {
            if (item.$.id && item.thumbnail) {
              thumbMap[item.$.id] = item.thumbnail;
            }
          }

          // Add thumbnails to results
          results = results.map((r) => ({
            ...r,
            thumbnail: thumbMap[r.bggId] || undefined,
          }));
        }
      }
    } catch (thumbError) {
      // Thumbnails are optional, continue without them
      console.warn('Failed to fetch thumbnails:', thumbError);
    }

    sendJson(res, { results });
  } catch (error) {
    console.error('BGG search error:', error);
    sendError(res, 'Failed to search BGG');
  }
});

// Get detailed game information by BGG ID
export const bggGameDetails = onRequest({ secrets: [bggApiToken] }, async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set(corsHeaders);
    res.status(204).send('');
    return;
  }

  const bggId = req.query.id;
  if (!bggId || typeof bggId !== 'string') {
    sendError(res, 'Missing game ID parameter "id"', 400);
    return;
  }

  try {
    // Fetch with retry logic for BGG's 202 "queued" responses
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    let xml = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const url = `${BGG_API_BASE}/thing?id=${encodeURIComponent(bggId)}&stats=1`;
      const response = await fetch(url, { headers: getBggHeaders() });

      if (response.status === 202) {
        // BGG is processing the request, wait and retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      if (!response.ok) {
        if (response.status === 401) {
          sendError(res, 'BGG API authentication required. Please configure BGG_API_TOKEN.', 401);
        } else {
          sendError(res, `BGG API request failed with status ${response.status}`, response.status);
        }
        return;
      }

      xml = await response.text();
      break;
    }

    if (!xml) {
      sendError(res, 'BGG API timed out (too many 202 responses)', 504);
      return;
    }

    const result = await parseStringPromise(xml, { explicitArray: false });

    // Check if game exists
    if (!result.items || !result.items.item) {
      sendError(res, 'Game not found', 404);
      return;
    }

    const item = result.items.item;

    // Extract primary name (or first name if no primary)
    let name = 'Unknown';
    if (item.name) {
      const names = Array.isArray(item.name) ? item.name : [item.name];
      const primaryName = names.find((n) => n.$.type === 'primary');
      name = primaryName?.$.value || names[0]?.$.value || 'Unknown';
    }

    // Extract categories from links
    let categories = [];
    if (item.link) {
      const links = Array.isArray(item.link) ? item.link : [item.link];
      categories = links
        .filter((link) => link.$.type === 'boardgamecategory')
        .map((link) => link.$.value);
    }

    // Build response object
    const gameDetails = {
      bggId: item.$.id,
      name,
      description: item.description || '',
      minPlayers: item.minplayers?.$.value
        ? parseInt(item.minplayers.$.value, 10)
        : undefined,
      maxPlayers: item.maxplayers?.$.value
        ? parseInt(item.maxplayers.$.value, 10)
        : undefined,
      playTimeMinutes: item.playingtime?.$.value
        ? parseInt(item.playingtime.$.value, 10)
        : undefined,
      yearPublished: item.yearpublished?.$.value
        ? parseInt(item.yearpublished.$.value, 10)
        : undefined,
      imageUrl: item.image || undefined,
      categories,
    };

    sendJson(res, gameDetails);
  } catch (error) {
    console.error('BGG details error:', error);
    sendError(res, 'Failed to fetch game details');
  }
});
