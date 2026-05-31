import { Box, Button, HStack, Icon } from '@chakra-ui/react'
import { GoogleLogin } from '@react-oauth/google'

export interface SocialAuthRowProps {
  onGoogleSuccess: (credential: string) => void
  onFacebookClick: () => void
  facebookLoading: boolean
  facebookEnabled: boolean
}

export const SocialAuthRow = ({
  onGoogleSuccess,
  onFacebookClick,
  facebookLoading,
  facebookEnabled,
}: SocialAuthRowProps) => {
  return (
    <HStack align="stretch" spacing={3}>
      <Box
        flex="1"
        borderWidth="1px"
        borderColor="border.muted"
        borderRadius="lg"
        px={2}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="white"
        minH="44px"
      >
        <GoogleLogin
          onSuccess={(credentialResponse) => onGoogleSuccess(credentialResponse.credential ?? '')}
          onError={() => {
            // keep UI simple for now
          }}
          useOneTap
        />
      </Box>

      <Button
        flex="1"
        leftIcon={
          <Icon viewBox="0 0 24 24" boxSize={5}>
            <path
              fill="#1877F2"
              d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078V12.073h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.512c-1.49 0-1.953.925-1.953 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
            />
          </Icon>
        }
        variant="outline"
        borderColor="border.muted"
        bg="white"
        height="44px"
        onClick={onFacebookClick}
        isLoading={facebookLoading}
        isDisabled={!facebookEnabled}
      >
        Tiếp tục với Facebook
      </Button>
    </HStack>
  )
}

