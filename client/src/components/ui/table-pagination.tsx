import { useTranslation } from 'react-i18next'
import { Button } from './button'

interface TablePaginationProps {
  page: number
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  count?: number
}

export function TablePagination({ page, hasPrev, hasNext, onPrev, onNext, count }: TablePaginationProps) {
  const { t } = useTranslation()

  if (!hasPrev && !hasNext) return null

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
      <span className="text-sm text-gray-400">
        {t('common.page')} {page}
        {count !== undefined && ` · ${count} ${t('common.items')}`}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>
          ‹ {t('common.prev')}
        </Button>
        <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
          {t('common.next')} ›
        </Button>
      </div>
    </div>
  )
}
