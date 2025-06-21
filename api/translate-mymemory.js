// api/translate-mymemory.js

// 이 서버리스 함수는 클라이언트의 번역 요청을 받아 MyMemory API로 전달하고 결과를 반환합니다.

module.exports = async (req, res) => {
    // 클라이언트로부터 번역할 텍스트, 원본 언어, 대상 언어를 요청 본문(body)에서 추출합니다.
    const { text, source, target } = req.body;

    // 필수 입력값(텍스트, 대상 언어)이 누락되었는지 확인하고, 누락 시 400 Bad Request 응답을 보냅니다.
    if (!text || !target) {
        return res.status(400).json({ success: false, error: '번역할 텍스트와 대상 언어가 필요합니다.' });
    }

    // MyMemory API를 위한 언어 코드 매핑. MyMemory는 특정 중국어 변형을 요구할 수 있습니다.
    // MyMemory Supported Languages: http://mymemory.translated.net/doc/supported-languages/
    const mapLanguageCode = (langCode) => {
        switch (langCode) {
            case 'zh': // Simplified Chinese in frontend
                return 'zh-CHS'; // MyMemory's code for Simplified Chinese
            case 'zh-TW': // Traditional Chinese (Taiwan) in frontend
                return 'zh-CHT'; // MyMemory's code for Traditional Chinese
            // MyMemory typically uses two-letter ISO codes, but handles some three-letter ones.
            // The frontend uses standard ISO codes, so default case should work for most.
            default:
                return langCode;
        }
    };

    const myMemorySource = mapLanguageCode(source);
    const myMemoryTarget = mapLanguageCode(target);

    let langpairParam = '';
    // MyMemory 문서에 따르면, 자동 감지를 위해 langpair 파라미터를 아예 생략할 수 있습니다.
    // `source`가 'auto' (즉, 프론트엔드에서 `null`로 넘어옴) 이거나 빈 문자열일 경우 생략합니다.
    if (myMemorySource && myMemorySource !== 'auto' && myMemorySource !== null && myMemorySource !== '') {
        langpairParam = `&langpair=${myMemorySource}|${myMemoryTarget}`;
    }
    // else, langpairParam remains an empty string, effectively omitting it from the URL.

    // MyMemory API의 무료 사용 제한을 완화하기 위해 이메일 주소를 제공할 수 있습니다.
    // Vercel 환경 변수 `MYMEMORY_EMAIL`에 이메일 주소를 설정해주세요.
    const emailParam = process.env.MYMEMORY_EMAIL ? `&de=${process.env.MYMEMORY_EMAIL}` : '';

    // MyMemory API 호출 URL을 구성합니다.
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}${langpairParam}${emailParam}`;

    try {
        // MyMemory API를 호출합니다.
        const apiResponse = await fetch(apiUrl);

        // HTTP 응답 상태 코드가 200 OK가 아니면 오류로 처리합니다.
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({})); // JSON 파싱 실패 대비
            // 콘솔에 MyMemory API에서 받은 원시 오류를 출력하여 디버깅에 도움을 줍니다.
            console.error('MyMemory API raw error:', errorData);
            throw new Error(errorData.responseDetails || `MyMemory API HTTP Error: ${apiResponse.status}`);
        }

        // API 응답을 JSON 형식으로 파싱합니다.
        const data = await apiResponse.json();

        // MyMemory API 응답에서 번역된 텍스트를 추출하고 성공적으로 응답합니다.
        // MyMemory API 응답 구조: { responseData: { translatedText: "...", match: ... }, responseDetails: "...", responseStatus: ... }
        if (data && data.responseData && data.responseData.translatedText) {
            const translatedText = data.responseData.translatedText;
            // 성공 응답 (HTTP 200 OK)
            return res.status(200).json({
                success: true,
                translation: translatedText,
                provider: 'MyMemory'
            });
        } else {
            // API 응답 형식이 예상과 다른 경우 (번역 결과가 없는 경우 등)
            // 콘솔에 API 응답 데이터를 출력하여 디버깅에 도움을 줍니다.
            console.error('MyMemory API response data missing translatedText or unexpected format:', data);
            throw new Error(data.responseDetails || 'MyMemory API 응답 형식이 예상과 다릅니다: 번역 결과 없음');
        }
    } catch (error) {
        // API 호출 중 발생한 모든 오류를 처리하고 500 Internal Server Error 응답을 보냅니다.
        console.error('MyMemory API 호출 실패:', error);
        return res.status(500).json({
            success: false,
            error: `MyMemory API 연결 또는 처리 중 오류 발생: ${error.message}`,
            provider: 'MyMemory'
        });
    }
