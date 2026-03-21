import { useEffect, useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { usePreferences } from '@/hooks/usePreferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 覆盖内置简历范文（仓库默认）。留空则使用服务端内置参考文本生成版式/语气。
 */
export function ResumeStyleReferenceCard() {
  const { getProfile, savePreferences, loading, error } = usePreferences();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      setText(p?.resumeStyleReference ?? '');
    });
  }, [getProfile]);

  const handleSave = async () => {
    setSaved(false);
    const ok = await savePreferences({ resumeStyleReference: text });
    if (ok) setSaved(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          简历样式参考（可选）
        </CardTitle>
        <CardDescription>
          生成精修/投递简历时，模型会参考内置范文（Zijia Pan Resume 结构）的章节顺序与 bullet 风格。
          若在此粘贴你自己的全文参考，将<strong>优先使用此处内容</strong>；留空则用内置范文。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="min-h-[200px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="留空 = 使用内置默认范文"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={handleSave} disabled={loading} className="gap-1.5">
            <Save className="h-4 w-4" />
            保存
          </Button>
          {saved && <span className="text-xs text-muted-foreground">已保存</span>}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
