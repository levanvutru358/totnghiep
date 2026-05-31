import { Link, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

const URL_RE = /(https?:\/\/[^\s]+)/g

type Segment = { type: 'text' | 'bold' | 'url'; value: string }

const parseSegments = (line: string): Segment[] => {
  const segments: Segment[] = []
  let rest = line

  while (rest.length > 0) {
    const boldMatch = rest.match(/\*\*(.+?)\*\*/)
    const urlMatch = rest.match(URL_RE)

    const boldIdx = boldMatch?.index ?? -1
    const urlIdx = urlMatch?.index ?? -1

    let nextIdx = -1
    let kind: 'bold' | 'url' | null = null

    if (boldIdx >= 0 && (urlIdx < 0 || boldIdx <= urlIdx)) {
      nextIdx = boldIdx
      kind = 'bold'
    } else if (urlIdx >= 0) {
      nextIdx = urlIdx
      kind = 'url'
    }

    if (kind === null || nextIdx < 0) {
      if (rest) segments.push({ type: 'text', value: rest })
      break
    }

    if (nextIdx > 0) {
      segments.push({ type: 'text', value: rest.slice(0, nextIdx) })
    }

    if (kind === 'bold' && boldMatch) {
      segments.push({ type: 'bold', value: boldMatch[1] })
      rest = rest.slice(nextIdx + boldMatch[0].length)
    } else if (kind === 'url' && urlMatch) {
      const raw = urlMatch[0].replace(/[),.]+$/, '')
      segments.push({ type: 'url', value: raw })
      rest = rest.slice(nextIdx + urlMatch[0].length)
    }
  }

  return segments
}

const renderLine = (line: string, key: string, isUser: boolean): ReactNode => {
  const parts = parseSegments(line)
  return (
    <Text key={key} fontSize="sm" as="span" display="block">
      {parts.map((part, i) => {
        if (part.type === 'bold') {
          return (
            <Text key={`${key}-b-${i}`} as="span" fontWeight="700">
              {part.value}
            </Text>
          )
        }
        if (part.type === 'url') {
          return (
            <Link
              key={`${key}-u-${i}`}
              href={part.value}
              isExternal
              color={isUser ? 'white' : 'pink.600'}
              textDecoration="underline"
              wordBreak="break-all"
            >
              {part.value}
            </Link>
          )
        }
        return <span key={`${key}-t-${i}`}>{part.value}</span>
      })}
    </Text>
  )
}

export const ChatMessageContent = ({
  content,
  isUser,
}: {
  content: string
  isUser: boolean
}) => {
  const lines = content.split('\n')
  return (
    <>
      {lines.map((line, idx) =>
        line.length === 0 ? (
          <br key={`br-${idx}`} />
        ) : (
          renderLine(line, `line-${idx}`, isUser)
        ),
      )}
    </>
  )
}
