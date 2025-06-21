// api/translate-libre.js

// This serverless function acts as a proxy for the LibreTranslate API.

module.exports = async (req, res) => {
    const { text, source, target } = req.body;

    // Validate required inputs
    if (!text || !target) {
        console.error('LibreTranslate API: Missing text or target language in request.');
        return res.status(400).json({ success: false, error: 'Translation text and target language are required.' });
    }

    // LibreTranslate public instance URL (might change, choose a stable one if needed)
    // Updated to a potentially more stable public instance, or you can self-host.
    // Ensure this URL is accessible from Vercel's servers.
    const libreTranslateUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com/translate';
    // If an API key is required for your chosen instance, set it as a Vercel environment variable.
    const apiKey = process.env.LIBRETRANSLATE_API_KEY || '';

    // LibreTranslate does not support 'zh-TW' directly, it generally uses 'zh' for both Simplified/Traditional or relies on context.
    // Given the frontend uses 'zh-TW', we'll map it to 'zh' for LibreTranslate.
    const libreTarget = (target === 'zh-TW') ? 'zh' : target;
    const libreSource = (source === 'zh-TW') ? 'zh' : source;

    try {
        const payload = {
            q: text,
            source: libreSource === 'auto' ? '' : libreSource, // LibreTranslate uses empty string for auto-detect
            target: libreTarget,
            format: 'text' // Explicitly request plain text format
        };

        if (apiKey) {
            payload.api_key = apiKey;
        }

        const apiResponse = await fetch(libreTranslateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await apiResponse.json();

        // Log raw API response for debugging
        console.log('LibreTranslate Raw API Response:', JSON.stringify(data, null, 2));


        if (!apiResponse.ok) {
            const errorMessage = data.error || `LibreTranslate API HTTP Error: ${apiResponse.status}`;
            console.error('LibreTranslate API Error response:', errorMessage);
            throw new Error(errorMessage);
        }

        if (data && data.translatedText) {
            return res.status(200).json({
                success: true,
                translation: data.translatedText,
                provider: 'LibreTranslate'
            });
        } else {
            console.error('LibreTranslate API: Missing translatedText or unexpected response format.', data);
            throw new Error('LibreTranslate API: Unexpected response format or no translation result.');
        }
    } catch (error) {
        console.error('LibreTranslate API call failed:', error);
        return res.status(500).json({
            success: false,
            error: `LibreTranslate API connection or processing error: ${error.message}`,
            provider: 'LibreTranslate'
        });
    }
};
