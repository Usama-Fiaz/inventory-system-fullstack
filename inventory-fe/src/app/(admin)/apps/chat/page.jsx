import { Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import { ChatProvider } from '@/context/useChatContext';
import ChatApp from './components/ChatApp';
const ChatPage = () => {
  return <>
      <PageMetaData title="Chat" />
      <Row className="g-1">
        <ChatProvider>
          <ChatApp />
        </ChatProvider>
      </Row>
    </>;
};
export default ChatPage;