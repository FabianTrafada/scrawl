"use client";

import { useMemo } from "react";
import { containsLatex, renderLatexToDisplayHTML } from "@/lib/latex";

interface Props {
  content: string;
  visible: boolean;
}

export default function LatexPreview({ content, visible }: Props) {
  const isLatex = containsLatex(content);

  const html = useMemo(() => {
    if (!isLatex || !content.trim()) return "";
    return renderLatexToDisplayHTML(content);
  }, [content, isLatex]);

  if (!visible || !isLatex || !content.trim()) return null;

  return (
    <div
      className="text-[#000000]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
