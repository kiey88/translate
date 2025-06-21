// api/translate-mymemory.js

// This serverless function acts as a proxy for the MyMemory Translate API.

module.exports = async (req, res) => {
    const { text, source, target } = req.body;

    // Validate required inputs
    if (!text || !target) {
        console.error('MyMemory API: Missing text or target language in request.');
        return res.status(400).json({ success: false, error: 'Translation text and target language are required.' });
    }

    // MyMemory API language code mapping
    const mapLanguageCode = (langCode) => {
        switch (langCode) {
            case 'zh': // Simplified Chinese from frontend
                return 'zh-CHS'; // MyMemory's code for Simplified Chinese
            case 'zh-TW': // Traditional Chinese (Taiwan) from frontend
                return 'zh-CHT'; // MyMemory's code for Traditional Chinese
            default:
                return langCode; // For other standard ISO 639-1 or RFC3066 codes
        }
    };

    const myMemorySource = mapLanguageCode(source);
    const myMemoryTarget = mapLanguageCode(target);

    let langpairParam = '';
    // If source is specified and not 'auto' or null, use langpair.
    // Otherwise, omit langpair for MyMemory to auto-detect.
    if (myMemorySource && myMemorySource !== 'auto' && myMemorySource !== null && myMemorySource !== '') {
        langpairParam = `&langpair=${myMemorySource}|${myMemoryTarget}`;
    }

    // Check for MYMEMORY_EMAIL environment variable
    const email = process.env.MYMEMORY_EMAIL;
    if (!email) {
        console.warn('MyMemory API: MYMEMORY_EMAIL environment variable is not set. This might lead to higher rate limits or errors.');
        // Consider returning an error here or proceeding without email, depending on desired strictness.
        // For now, we'll proceed but log a warning.
    }
    const emailParam = email ? `&de=${encodeURIComponent(email)}` : ''; // Ensure email is URL-encoded

    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}${langpairParam}${emailParam}`;
    console.log(`MyMemory API URL: ${apiUrl}`); // Log the full API URL for debugging

    try {
        const apiResponse = await fetch(apiUrl);
        const data = await apiResponse.json();

        // Log raw API response for debugging
        console.log('MyMemory Raw API Response:', JSON.stringify(data, null, 2));

        if (!apiResponse.ok || (data && data.responseStatus && data.responseStatus !== 200)) {
            const errorMessage = data.responseDetails || `MyMemory API HTTP Error: ${apiResponse.status}`;
            console.error('MyMemory API Error response:', errorMessage);
            throw new Error(errorMessage);
        }

        if (data && data.responseData && data.responseData.translatedText) {
            const translatedText = data.responseData.translatedText;
            return res.status(200).json({
                success: true,
                translation: translatedText,
                provider: 'MyMemory'
            });
        } else {
            console.error('MyMemory API: Missing translatedText or unexpected response format.', data);
            throw new Error('MyMemory API: Unexpected response format or no translation result.');
        }
    } catch (error) {
        console.error('MyMemory API call failed:', error);
        return res.status(500).json({
            success: false,
            error: `MyMemory API connection or processing error: ${error.message}`,
            provider: 'MyMemory'
        });
    }
};
