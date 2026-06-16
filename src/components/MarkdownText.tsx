import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';

type InlinePart = { bold: boolean; italic: boolean; text: string };

function parseInline(raw: string): InlinePart[] {
  const parts: InlinePart[] = [];
  // Order matters: ***bold+italic*** before **bold** before *italic*
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/gs;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) parts.push({ bold: false, italic: false, text: raw.slice(last, m.index) });
    if (m[2] !== undefined)      parts.push({ bold: true,  italic: true,  text: m[2] });
    else if (m[3] !== undefined) parts.push({ bold: true,  italic: false, text: m[3] });
    else                         parts.push({ bold: false, italic: true,  text: m[4] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) parts.push({ bold: false, italic: false, text: raw.slice(last) });
  return parts;
}

function InlineLine({ parts, base }: { parts: InlinePart[]; base: TextStyle }) {
  if (parts.length === 1 && !parts[0].bold && !parts[0].italic) {
    return <Text style={base}>{parts[0].text}</Text>;
  }
  return (
    <Text style={base}>
      {parts.map((p, i) => (
        <Text
          key={i}
          style={[
            base,
            p.bold   ? md.bold   : undefined,
            p.italic ? md.italic : undefined,
          ]}
        >
          {p.text}
        </Text>
      ))}
    </Text>
  );
}

export function MarkdownText({
  text,
  style,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
}) {
  const flat = StyleSheet.flatten(style) ?? {};
  const base: TextStyle = { fontSize: 14, color: '#2E3C50', lineHeight: 21, ...flat };
  const bulletBase: TextStyle = { ...base, flex: 1 };

  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let prevWasBlank = true;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      if (!prevWasBlank) nodes.push(<View key={`g${i}`} style={md.gap} />);
      prevWasBlank = true;
      continue;
    }
    prevWasBlank = false;

    // Bullet: * item  or  - item  or  •  item
    const bullet = /^[*\-•]\s+(.*)/.exec(trimmed);
    if (bullet) {
      nodes.push(
        <View key={`b${i}`} style={md.bulletRow}>
          <Text style={[base, md.bulletDot]}>{'•'}</Text>
          <InlineLine parts={parseInline(bullet[1])} base={bulletBase} />
        </View>
      );
      continue;
    }

    // Numbered list: 1. item
    const numbered = /^(\d+)\.\s+(.*)/.exec(trimmed);
    if (numbered) {
      nodes.push(
        <View key={`n${i}`} style={md.bulletRow}>
          <Text style={[base, md.numLabel]}>{numbered[1]}.</Text>
          <InlineLine parts={parseInline(numbered[2])} base={bulletBase} />
        </View>
      );
      continue;
    }

    // Regular paragraph (may contain inline bold / italic)
    nodes.push(<InlineLine key={`p${i}`} parts={parseInline(trimmed)} base={base} />);
  }

  return <View style={md.root}>{nodes}</View>;
}

const md = StyleSheet.create({
  root:      { gap: 3 },
  gap:       { height: 7 },
  bold:      { fontWeight: '700' },
  italic:    { fontStyle: 'italic' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 1 },
  bulletDot: { marginRight: 7, marginTop: 1, lineHeight: 21 },
  numLabel:  { marginRight: 5, minWidth: 20, lineHeight: 21 },
});
