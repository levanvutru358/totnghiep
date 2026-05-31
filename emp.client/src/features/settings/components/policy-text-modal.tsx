import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react'

type PolicyTextModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  body: string | null | undefined
}

export const PolicyTextModal = ({ isOpen, onClose, title, body }: PolicyTextModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>{title}</ModalHeader>
      <ModalCloseButton />
      <ModalBody pb={6}>
        <Text whiteSpace="pre-wrap" fontSize="sm" color="text.secondary">
          {body?.trim() || 'Nội dung chính sách đang được cập nhật.'}
        </Text>
      </ModalBody>
    </ModalContent>
  </Modal>
)
