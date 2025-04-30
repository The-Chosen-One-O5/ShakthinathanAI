// Use import syntax if your package.json has "type": "module"
// import fetch from 'node-fetch';
// Otherwise, use require
const fetch = require('node-fetch');

const IMAGE_API_URL = 'https://inferrence.mcpcore.xyz/v1/images/generations';
// IMPORTANT: Store your API key securely in Netlify Environment Variables
const IMAGE_API_KEY = process.env.IMAGE_API_KEY; // Name it exactly like this in Netlify UI

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

     if (!IMAGE_API_KEY) {
        console.error('Image API Key not set in environment variables.');
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Missing API Key.' }) };
    }


    try {
        const body = JSON.parse(event.body);
        const prompt = body.prompt;
        const size = body.size || "1024x1024"; // Get data from frontend

        if (!prompt) {
             return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request: Missing prompt in request body.' }) };
        }

        // Call the actual Image Generation API
        const response = await fetch(IMAGE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${IMAGE_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-image-1', // Or your preferred model
                prompt: prompt,
                size: size
            })
        });

        const responseData = await response.json();

        // Check for errors from the Image API
        if (!response.ok) {
            console.error(`Image API Error (${response.status}):`, responseData);
            // Try to return the error message from the API if available
            const errorMessage = responseData?.error?.message || `Image API Error: ${response.statusText}`;
             return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorMessage, details: responseData })
            };
        }

        // Extract the image URL (adjust path if API response structure changes)
        const imageUrl = responseData?.data?.[0]?.url;

        if (!imageUrl) {
            console.error('Image URL not found in API response:', responseData);
             return { statusCode: 500, body: JSON.stringify({ error: 'Image URL not found in API response.' }) };
        }

        // Send the successful response back to the frontend
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            // Return JSON in the format the frontend expects
            body: JSON.stringify({ imageUrl: imageUrl })
        };

    } catch (error) {
         console.error('Error in Image proxy function:', error);
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
