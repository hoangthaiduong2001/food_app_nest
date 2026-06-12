import { useState } from 'react'

export function useCursorPagination(limit = 20) {
  const [cursorStack, setCursorStack] = useState<(number | undefined)[]>([undefined])
  const [currentIndex, setCurrentIndex] = useState(0)

  const cursor = cursorStack[currentIndex]

  function nextPage(nextCursor: number) {
    const newStack = cursorStack.slice(0, currentIndex + 1)
    newStack.push(nextCursor)
    setCursorStack(newStack)
    setCurrentIndex(currentIndex + 1)
  }

  function prevPage() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  function reset() {
    setCursorStack([undefined])
    setCurrentIndex(0)
  }

  return {
    cursor,
    limit,
    page: currentIndex + 1,
    hasPrev: currentIndex > 0,
    nextPage,
    prevPage,
    reset,
  }
}
