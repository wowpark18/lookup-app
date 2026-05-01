/**
 * Firebase Auth 에러 코드를 한국어 메시지로 변환합니다.
 */
export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.';
    case 'auth/user-disabled':
      return '비활성화된 계정입니다. 관리자에게 문의하세요.';
    case 'auth/user-not-found':
      return '가입되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.';
    case 'auth/wrong-password':
      return '비밀번호가 틀렸습니다. 다시 확인해주세요.';
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일입니다.';
    case 'auth/weak-password':
      return '비밀번호가 너무 취약합니다. 6자리 이상으로 설정해주세요.';
    case 'auth/operation-not-allowed':
      return '허용되지 않은 인증 방식입니다.';
    case 'auth/network-request-failed':
      return '네트워크 연결이 원활하지 않습니다. 인터넷 연결을 확인해주세요.';
    case 'auth/too-many-requests':
      return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
    case 'auth/internal-error':
      return '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    default:
      return '인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.';
  }
};

/**
 * 이메일 형식을 검증합니다.
 */
export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
