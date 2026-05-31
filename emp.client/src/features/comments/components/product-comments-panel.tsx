import { ChatIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Collapse,
  HStack,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LikeToggleButton } from '../../../shared/components/like-toggle-button'
import { useAuthModal } from '../../auth/context/auth-modal-context'
import { commerceApi } from '../../commerce/services/commerce.api'
import { CommentImageGallery } from './comment-image-gallery'
import { commentsApi, type ProductComment } from '../services/comments.api'

const FilePreviewRow = ({ urls }: { urls: string[] }) => {
  if (!urls.length) return null
  return (
    <HStack mt={2} flexWrap="wrap" gap={2}>
      {urls.map((url) => (
        <Box key={url} borderWidth="1px" borderRadius="md" overflow="hidden" borderColor="border.subtle">
          <Box as="img" src={url} alt="Xem trước" h="72px" w="72px" objectFit="cover" />
        </Box>
      ))}
    </HStack>
  )
}

const uploadImageIds = async (files: File[]) => {
  if (!files.length) return [] as number[]
  const uploaded = await commentsApi.uploadImages(files)
  return uploaded.map((item) => item.id)
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const normalizeReplies = (parentId: number, rows: ProductComment[]) =>
  rows.filter((r) => r.parentId === parentId && r.id !== parentId)

type Props = { productId: number }

type CommentRowProps = {
  comment: ProductComment
  isReply?: boolean
  isOwner: boolean
  replyParentId?: number
  replyOpen: boolean
  replyDraft: string
  editOpen: boolean
  editDraft: string
  submitting: boolean
  actionLoading: boolean
  likingCommentId: number | null
  hasExpandedReplies: boolean
  onToggleLike: (comment: ProductComment, replyParentId?: number) => void
  onToggleReply: (commentId: number) => void
  onToggleReplies: (commentId: number) => void
  onReplyDraftChange: (commentId: number, value: string) => void
  onSubmitReply: (parentId: number) => void
  onStartEdit: (comment: ProductComment) => void
  onCancelEdit: () => void
  onEditDraftChange: (commentId: number, value: string) => void
  onSaveEdit: (comment: ProductComment, replyParentId?: number) => void
  onDelete: (comment: ProductComment, replyParentId?: number) => void
  onMention: (comment: ProductComment) => void
  replyFiles: File[]
  onReplyFilesChange: (files: File[]) => void
  replyPreviewUrls: string[]
  editFiles: File[]
  onEditFilesChange: (files: File[]) => void
  editPreviewUrls: string[]
}

const CommentRow = ({
  comment,
  isReply = false,
  isOwner,
  replyParentId,
  replyOpen,
  replyDraft,
  editOpen,
  editDraft,
  submitting,
  actionLoading,
  likingCommentId,
  hasExpandedReplies,
  onToggleLike,
  onToggleReply,
  onToggleReplies,
  onReplyDraftChange,
  onSubmitReply,
  onStartEdit,
  onCancelEdit,
  onEditDraftChange,
  onSaveEdit,
  onDelete,
  onMention,
  replyFiles,
  onReplyFilesChange,
  replyPreviewUrls,
  editFiles,
  onEditFilesChange,
  editPreviewUrls,
}: CommentRowProps) => (
  <Box pl={isReply ? 4 : 0} borderLeftWidth={isReply ? '2px' : 0} borderColor="border.subtle">
    <HStack justify="space-between" align="start">
      <Text fontSize="sm" fontWeight="700">
        {comment.userName}
      </Text>
      <Text fontSize="xs" color="text.secondary">
        {formatTime(comment.createdAt)}
      </Text>
    </HStack>

    {editOpen ? (
      <VStack align="stretch" mt={2} spacing={2}>
        <Textarea
          size="sm"
          value={editDraft}
          onChange={(e) => onEditDraftChange(comment.id, e.target.value)}
          rows={3}
          autoFocus
        />
        <Input
          type="file"
          accept="image/*"
          multiple
          size="sm"
          onChange={(e) => onEditFilesChange(Array.from(e.target.files ?? []))}
        />
        <FilePreviewRow urls={editPreviewUrls} />
        {(comment.images?.length ?? 0) > 0 && <CommentImageGallery images={comment.images ?? []} />}
        <HStack>
          <Button
            size="xs"
            colorScheme="pink"
            isLoading={actionLoading}
            onClick={() => onSaveEdit(comment, replyParentId)}
          >
            Lưu
          </Button>
          <Button size="xs" variant="outline" onClick={onCancelEdit}>
            Hủy
          </Button>
        </HStack>
      </VStack>
    ) : (
      <Text fontSize="sm" mt={1} whiteSpace="pre-wrap">
        {comment.content}
      </Text>
    )}

    {!editOpen && <CommentImageGallery images={comment.images ?? []} />}

    {!editOpen && (
      <HStack mt={2} spacing={3} fontSize="xs" flexWrap="wrap">
        <LikeToggleButton
          liked={comment.liked}
          likeCount={comment.likeCount}
          isLoading={likingCommentId === comment.id}
          onClick={() => onToggleLike(comment, replyParentId)}
        />

        {!isReply && (
          <Button size="xs" variant="ghost" onClick={() => onToggleReply(comment.id)}>
            {replyOpen ? 'Hủy' : 'Trả lời'}
          </Button>
        )}

        {!isReply && (
          <Button size="xs" variant="ghost" onClick={() => onToggleReplies(comment.id)}>
            {hasExpandedReplies ? 'Ẩn' : 'Xem'} phản hồi
          </Button>
        )}

        {isOwner && (
          <>
            <Button size="xs" variant="ghost" onClick={() => onStartEdit(comment)}>
              Sửa
            </Button>
            <Button
              size="xs"
              variant="ghost"
              colorScheme="red"
              isLoading={actionLoading}
              onClick={() => onDelete(comment, replyParentId)}
            >
              Xóa
            </Button>
            <Button size="xs" variant="ghost" onClick={() => onMention(comment)}>
              Nhắc @
            </Button>
          </>
        )}
      </HStack>
    )}

    {!isReply && replyOpen && (
      <Box mt={2} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <HStack align="end">
          <VStack align="stretch" flex={1} spacing={2}>
            <Textarea
              size="sm"
              placeholder="Viết phản hồi..."
              value={replyDraft}
              onChange={(e) => onReplyDraftChange(comment.id, e.target.value)}
              rows={2}
              autoFocus
            />
            <Input
              type="file"
              accept="image/*"
              multiple
              size="sm"
              onChange={(e) => onReplyFilesChange(Array.from(e.target.files ?? []))}
            />
            <FilePreviewRow urls={replyPreviewUrls} />
          </VStack>
          <Button
            size="sm"
            colorScheme="pink"
            bg="brand.600"
            isLoading={submitting}
            onClick={() => onSubmitReply(comment.id)}
          >
            Gửi
          </Button>
        </HStack>
      </Box>
    )}
  </Box>
)

export const ProductCommentsPanel = ({ productId }: Props) => {
  const { currentUser, openAuthModal } = useAuthModal()
  const [items, setItems] = useState<ProductComment[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [formFiles, setFormFiles] = useState<File[]>([])
  const [formPreviewUrls, setFormPreviewUrls] = useState<string[]>([])
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [replyPreviewUrls, setReplyPreviewUrls] = useState<string[]>([])
  const [editFiles, setEditFiles] = useState<File[]>([])
  const [editPreviewUrls, setEditPreviewUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({})
  const [expandedReplies, setExpandedReplies] = useState<Record<number, ProductComment[]>>({})
  const [loadingReplies, setLoadingReplies] = useState<Record<number, boolean>>({})
  const [likingCommentId, setLikingCommentId] = useState<number | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editDrafts, setEditDrafts] = useState<Record<number, string>>({})
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  const mergeComment = (fresh: ProductComment, replyParentId?: number) => {
    if (replyParentId != null) {
      setExpandedReplies((prev) => ({
        ...prev,
        [replyParentId]: normalizeReplies(
          replyParentId,
          (prev[replyParentId] ?? []).map((r) => (r.id === fresh.id ? fresh : r)),
        ),
      }))
      return
    }
    setItems((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))
  }

  const removeComment = (commentId: number, replyParentId?: number) => {
    if (replyParentId != null) {
      setExpandedReplies((prev) => ({
        ...prev,
        [replyParentId]: (prev[replyParentId] ?? []).filter((r) => r.id !== commentId),
      }))
      return
    }
    setItems((prev) => prev.filter((r) => r.id !== commentId))
    setExpandedReplies((prev) => {
      const next = { ...prev }
      delete next[commentId]
      return next
    })
  }

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const data = await commentsApi.listByProduct(productId, { page: 1, limit: 30, sort: 'newest' })
      setItems(data.items)
    } catch {
      setItems([])
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const urls = formFiles.map((file) => URL.createObjectURL(file))
    setFormPreviewUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [formFiles])

  useEffect(() => {
    const urls = replyFiles.map((file) => URL.createObjectURL(file))
    setReplyPreviewUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [replyFiles])

  useEffect(() => {
    const urls = editFiles.map((file) => URL.createObjectURL(file))
    setEditPreviewUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [editFiles])

  const toggleReplies = async (commentId: number) => {
    if (expandedReplies[commentId]) {
      setExpandedReplies((prev) => {
        const next = { ...prev }
        delete next[commentId]
        return next
      })
      return
    }

    setLoadingReplies((p) => ({ ...p, [commentId]: true }))
    try {
      const data = await commentsApi.listReplies(commentId, { limit: 50 })
      setExpandedReplies((p) => ({ ...p, [commentId]: data.items }))
    } finally {
      setLoadingReplies((p) => ({ ...p, [commentId]: false }))
    }
  }

  const submitComment = async () => {
    if (!commerceApi.hasServerToken()) {
      openAuthModal()
      return
    }
    const text = content.trim()
    if (!text) return

    setSubmitting(true)
    try {
      const imageIds = await uploadImageIds(formFiles)
      const created = await commentsApi.create({
        productId,
        content: text,
        images: imageIds.length ? imageIds : undefined,
      })
      setContent('')
      setFormFiles([])
      setItems((prev) => [created, ...prev.filter((row) => row.id !== created.id)])
    } finally {
      setSubmitting(false)
    }
  }

  const submitReply = async (parentId: number) => {
    if (!commerceApi.hasServerToken()) {
      openAuthModal()
      return
    }
    const text = (replyDrafts[parentId] ?? '').trim()
    if (!text) return

    setSubmitting(true)
    try {
      const imageIds = await uploadImageIds(replyFiles)
      const created = await commentsApi.reply({
        parentId,
        content: text,
        images: imageIds.length ? imageIds : undefined,
      })
      setReplyDrafts((prev) => {
        const next = { ...prev }
        delete next[parentId]
        return next
      })
      setReplyFiles([])
      setReplyTo(null)

      const data = await commentsApi.listReplies(parentId, { limit: 50 })
      const merged = data.items.some((r) => r.id === created.id) ? data.items : [created, ...data.items]
      setExpandedReplies((p) => ({ ...p, [parentId]: normalizeReplies(parentId, merged) }))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleLike = async (comment: ProductComment, replyParentId?: number) => {
    if (!commerceApi.hasServerToken()) {
      openAuthModal()
      return
    }
    if (likingCommentId === comment.id) return

    setLikingCommentId(comment.id)
    try {
      const fresh = comment.liked
        ? await commentsApi.unlike(comment.id)
        : await commentsApi.like(comment.id)
      mergeComment(fresh, replyParentId)
    } catch {
      const fresh = await commentsApi.getDetail(comment.id).catch(() => null)
      if (fresh) mergeComment(fresh, replyParentId)
    } finally {
      setLikingCommentId(null)
    }
  }

  const startEdit = (comment: ProductComment) => {
    setEditingCommentId(comment.id)
    setEditDrafts((prev) => ({ ...prev, [comment.id]: comment.content }))
    setEditFiles([])
  }

  const saveEdit = async (comment: ProductComment, replyParentId?: number) => {
    const text = (editDrafts[comment.id] ?? '').trim()
    if (!text) return

    setActionLoadingId(comment.id)
    try {
      const imageIds = await uploadImageIds(editFiles)
      const updated = await commentsApi.update(comment.id, {
        content: text,
        images: imageIds.length ? imageIds : undefined,
      })
      mergeComment(updated, replyParentId)
      setEditingCommentId(null)
      setEditFiles([])
    } finally {
      setActionLoadingId(null)
    }
  }

  const deleteComment = async (comment: ProductComment, replyParentId?: number) => {
    if (!window.confirm('Xóa bình luận này?')) return

    setActionLoadingId(comment.id)
    try {
      await commentsApi.remove(comment.id)
      removeComment(comment.id, replyParentId)
    } finally {
      setActionLoadingId(null)
    }
  }

  const mentionUser = async (comment: ProductComment) => {
    if (!commerceApi.hasServerToken()) {
      openAuthModal()
      return
    }
    const raw = window.prompt('Nhập @tên_người_dùng hoặc email cần nhắc:')?.trim()
    if (!raw) return
    const username = raw.startsWith('@') ? raw : `@${raw}`

    setActionLoadingId(comment.id)
    try {
      await commentsApi.mention(comment.id, username)
      window.alert(`Đã gửi thông báo nhắc ${username}.`)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Không tìm thấy người dùng để nhắc.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const renderRow = (comment: ProductComment, replyParentId?: number) => {
    const isReply = replyParentId != null
    return (
      <CommentRow
        key={isReply ? `reply-${comment.id}` : comment.id}
        comment={comment}
        isReply={isReply}
        isOwner={currentUser?.id === comment.userId}
        replyParentId={replyParentId}
        replyOpen={replyTo === comment.id}
        replyDraft={replyDrafts[comment.id] ?? ''}
        editOpen={editingCommentId === comment.id}
        editDraft={editDrafts[comment.id] ?? comment.content}
        submitting={submitting}
        actionLoading={actionLoadingId === comment.id}
        likingCommentId={likingCommentId}
        hasExpandedReplies={Boolean(expandedReplies[comment.id]?.length)}
        onToggleLike={(row, parentId) => void toggleLike(row, parentId)}
        onToggleReply={(commentId) => setReplyTo((current) => (current === commentId ? null : commentId))}
        onToggleReplies={(commentId) => void toggleReplies(commentId)}
        onReplyDraftChange={(commentId, value) => setReplyDrafts((prev) => ({ ...prev, [commentId]: value }))}
        onSubmitReply={(parentId) => void submitReply(parentId)}
        onStartEdit={startEdit}
        onCancelEdit={() => setEditingCommentId(null)}
        onEditDraftChange={(commentId, value) => setEditDrafts((prev) => ({ ...prev, [commentId]: value }))}
        onSaveEdit={(row, parentId) => void saveEdit(row, parentId)}
        onDelete={(row, parentId) => void deleteComment(row, parentId)}
        onMention={(row) => void mentionUser(row)}
        replyFiles={replyTo === comment.id ? replyFiles : []}
        onReplyFilesChange={replyTo === comment.id ? setReplyFiles : () => undefined}
        replyPreviewUrls={replyTo === comment.id ? replyPreviewUrls : []}
        editFiles={editingCommentId === comment.id ? editFiles : []}
        onEditFilesChange={editingCommentId === comment.id ? setEditFiles : () => undefined}
        editPreviewUrls={editingCommentId === comment.id ? editPreviewUrls : []}
      />
    )
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Box borderWidth="1px" borderRadius="lg" p={4} borderColor="border.subtle">
        <Text fontWeight="700" fontSize="sm" mb={2}>
          Bình luận về sản phẩm
        </Text>
        <Textarea
          size="sm"
          placeholder="Ví dụ: Còn hàng size 42 không?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <Input
          mt={2}
          type="file"
          accept="image/*"
          multiple
          size="sm"
          onChange={(e) => setFormFiles(Array.from(e.target.files ?? []))}
        />
        <FilePreviewRow urls={formPreviewUrls} />
        <Button
          mt={2}
          size="sm"
          leftIcon={<ChatIcon />}
          colorScheme="pink"
          bg="brand.600"
          isLoading={submitting}
          onClick={() => void submitComment()}
        >
          Gửi bình luận
        </Button>
      </Box>

      {loading && (
        <HStack justify="center" py={6}>
          <Spinner size="sm" />
        </HStack>
      )}

      {!loading && items.length === 0 && (
        <Text fontSize="sm" color="text.secondary">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </Text>
      )}

      {items.map((comment) => (
        <Box key={comment.id} borderWidth="1px" borderRadius="lg" p={4} borderColor="border.subtle">
          {renderRow(comment)}
          <Collapse in={Boolean(expandedReplies[comment.id]) || loadingReplies[comment.id]} animateOpacity unmountOnExit={false}>
            <VStack align="stretch" mt={3} spacing={3} pl={2}>
              {loadingReplies[comment.id] && <Spinner size="sm" />}
              {normalizeReplies(comment.id, expandedReplies[comment.id] ?? []).map((reply) =>
                renderRow(reply, comment.id),
              )}
            </VStack>
          </Collapse>
        </Box>
      ))}
    </VStack>
  )
}
