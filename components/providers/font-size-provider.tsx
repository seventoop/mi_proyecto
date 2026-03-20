"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type FontSize = "sm" | "base" | "lg";

interface FontSizeContextType {
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType>({
    fontSize: "base",
    setFontSize: () => null,
});

export function FontSizeProvider({ children, defaultSize = "base" }: { children: React.ReactNode; defaultSize?: FontSize }) {
    const [fontSize, setFontSizeState] = useState<FontSize>(defaultSize);

    useEffect(() => {
        // Load from localStorage or use default
        const saved = localStorage.getItem("seventoop-fontsize") as FontSize;
        if (saved && ["sm", "base", "lg"].includes(saved)) {
            setFontSizeState(saved);
        } else {
            setFontSizeState(defaultSize);
        }
    }, [defaultSize]);

    const setFontSize = (size: FontSize) => {
        setFontSizeState(size);
        localStorage.setItem("seventoop-fontsize", size);
    };

    // Apply scaling to the document root element using CSS classes
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("font-size-sm", "font-size-base", "font-size-lg");
        root.classList.add(`font-size-${fontSize}`);

        // Ultra aggressive override to ensure Tailwind rem scales properly regardless of caching
        let pixelSize = "16px";
        if (fontSize === "base") pixelSize = "17.5px";
        if (fontSize === "lg") pixelSize = "20px";

        root.style.setProperty("font-size", pixelSize, "important");

        // Inject style tag to guarantee head priority over preflight
        let styleTag = document.getElementById("seventoop-fontsize-override");
        if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = "seventoop-fontsize-override";
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = `html { font-size: ${pixelSize} !important; }`;
    }, [fontSize]);

    return (
        <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
            {children}
        </FontSizeContext.Provider>
    );
}

export function useFontSize() {
    return useContext(FontSizeContext);
}
