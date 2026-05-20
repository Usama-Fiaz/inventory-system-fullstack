import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper';
import AppRouter from './routes/router';
import ScrollToTop from '@/components/layout/ScrollToTop';
import '@/assets/scss/app.scss';
const App = () => {
  return <AppProvidersWrapper>
      <ScrollToTop />
      <AppRouter />
    </AppProvidersWrapper>;
};
export default App;