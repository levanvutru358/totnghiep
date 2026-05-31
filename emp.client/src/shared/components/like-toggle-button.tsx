import { HStack, IconButton, Spinner, Text } from '@chakra-ui/react'
import type { MouseEvent } from 'react'
import { FaRegThumbsUp, FaThumbsUp } from 'react-icons/fa6'

const LIKED_BLUE = '#1877F2'

type Props = {
  liked: boolean
  likeCount: number
  isLoading?: boolean
  onClick: () => void
}

export const LikeToggleButton = ({ liked, likeCount, isLoading, onClick }: Props) => {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <HStack spacing={1} align="center">
      <IconButton
        aria-label={liked ? 'Bỏ thích' : 'Thích'}
        size="xs"
        variant="ghost"
        minW={8}
        h={8}
        borderRadius="full"
        bg={liked ? 'transparent' : 'gray.300'}
        _hover={{ bg: liked ? 'blue.50' : 'gray.400' }}
        onClick={handleClick}
        icon={
          isLoading ? (
            <Spinner size="xs" color={liked ? LIKED_BLUE : 'white'} />
          ) : liked ? (
            <FaThumbsUp size={16} color={LIKED_BLUE} />
          ) : (
            <FaRegThumbsUp size={16} color="white" />
          )
        }
      />
      {likeCount > 0 && (
        <Text fontSize="xs" color={liked ? 'blue.600' : 'text.secondary'} fontWeight={liked ? 700 : 500}>
          {likeCount}
        </Text>
      )}
    </HStack>
  )
}
