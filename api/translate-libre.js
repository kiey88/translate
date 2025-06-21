        // api/translate-libre.js

        // 이 서버리스 함수는 클라이언트의 번역 요청을 받아 LibreTranslate API로 전달하고 결과를 반환합니다.

        module.exports = async (req, res) => {
            const { text, source, target } = req.body;

            if (!text || !target) {
                return res.status(400).json({ success: false, error: '번역할 텍스트와 대상 언어가 필요합니다.' });
            }

            // LibreTranslate 공개 인스턴스 URL (변경될 수 있습니다. 필요시 안정적인 인스턴스로 교체하세요.)
            // 또는 직접 LibreTranslate를 호스팅하여 사용할 수 있습니다.
            const libreTranslateUrl = process.env.LIBRETRANSLATE_URL || 'https://translate.argosopentech.com/translate';
            // 만약 API 키가 필요하다면, Vercel 환경 변수 LIBRETRANSLATE_API_KEY에 설정해주세요.
            const apiKey = process.env.LIBRETRANSLATE_API_KEY || '';

            try {
                const apiResponse = await fetch(libreTranslateUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // 'X-API-Key': apiKey // API 키가 필요한 경우 주석 해제 및 사용
                    },
                    body: JSON.stringify({
                        q: text,
                        source: source === 'auto' ? '' : source, // LibreTranslate는 빈 문자열로 자동 감지
                        target: target,
                        format: 'text',
                        api_key: apiKey // API 키가 필요한 경우
                    })
                });

                if (!apiResponse.ok) {
                    const errorData = await apiResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || `LibreTranslate API HTTP Error: ${apiResponse.status}`);
                }

                const data = await apiResponse.json();

                if (data && data.translatedText) {
                    return res.status(200).json({
                        success: true,
                        translation: data.translatedText,
                        provider: 'LibreTranslate'
                    });
                } else {
                    throw new Error(data.error || 'LibreTranslate API 응답 형식이 예상과 다릅니다.');
                }
            } catch (error) {
                console.error('LibreTranslate API 호출 실패:', error);
                return res.status(500).json({
                    success: false,
                    error: `LibreTranslate API 연결 또는 처리 중 오류 발생: ${error.message}`,
                    provider: 'LibreTranslate'
                });
            }
        };
        
