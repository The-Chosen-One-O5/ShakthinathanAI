// Use import syntax if your package.json has "type": "module"
// import fetch from 'node-fetch';
// Otherwise, use require
const fetch = require('node-fetch');

const GROK_API_URL = 'https://oa-grok.host.sdk.li/v1/chat/completions';
// IMPORTANT: Store your API key securely in Netlify Environment Variables
const GROK_API_KEY = process.env.GROK_API_KEY; // Name it exactly like this in Netlify UI

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!GROK_API_KEY) {
        console.error('Grok API Key not set in environment variables.');
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Missing API Key.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const messages = body.messages; // Get message history from frontend

        if (!messages) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request: Missing messages array in request body.' }) };
        }

        // Call the actual Grok API
        const response = await fetch(GROK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'grok-3-fast', // Or your preferred model
                messages: messages,
                stream: true // Request streaming from Grok
            })
        });

        // Check for errors from Grok API itself before streaming
        if (!response.ok) {
            const errorData = await response.text(); // Get error text
             console.error(`Grok API Error (${response.status}): ${errorData}`);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Grok API Error: ${response.statusText}`, details: errorData })
            };
        }

        // --- Stream the response back to the client ---
        // Netlify Functions support returning streams directly
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/event-stream', // Set correct content type for SSE
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
            body: response.body, // Pass the readable stream from fetch
            isBase64Encoded: false
        };

    } catch (error) {
        console.error('Error in Grok proxy function:', error);
        // Differentiate between JSON parse errors and other errors
        if (error instanceof SyntaxError) {
             return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request: Invalid JSON in request body.' }) };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error in Proxy', details: error.message })
        };
    }
};
