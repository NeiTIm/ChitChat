import { useMemo, useState } from 'react'

export function useConversationSearch(conversations, people) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => conversations.filter(item => {
    const user = people[item.otherUserId]
    return (user?.displayName || user?.username || 'Người dùng').toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))
  }), [conversations, people, query])
  return { query, setQuery, filtered }
}
