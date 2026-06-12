// Google Translate Service (unofficial free endpoint)
// This replaces the static dictionary with dynamic fetching.

const fetchTranslation = async (text: string, targetLang: string): Promise<string> => {
    if (!text) return "";
    
    try {
        // Use the 'gtx' client endpoint which is commonly used for free translation in browser extensions
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // The API returns a complex array structure. 
        // data[0] contains the translated segments.
        // We map over them and join to get the full translated string.
        if (data && data[0]) {
            return data[0].map((chunk: any) => chunk[0]).join('');
        }
        
        return text;
    } catch (error) {
        console.warn(`Translation to ${targetLang} failed (CORS or Network error):`, error);
        // Fallback to original text so the UI doesn't break
        return text;
    }
};

export const translateAnnouncement = async (title: string, content: string) => {
    // Execute translations in parallel for better performance
    const [titleFr, contentFr, titleAr, contentAr] = await Promise.all([
        fetchTranslation(title, 'fr'),
        fetchTranslation(content, 'fr'),
        fetchTranslation(title, 'ar'),
        fetchTranslation(content, 'ar')
    ]);

    return {
        en: { 
            title: title, 
            content: content 
        },
        fr: { 
            title: titleFr, 
            content: contentFr 
        },
        ar: { 
            title: titleAr, 
            content: contentAr 
        }
    };
};