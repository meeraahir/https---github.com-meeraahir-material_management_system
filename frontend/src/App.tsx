import { AppRoutes } from "./routes/AppRoutes";
import { ToastProvider } from "./components/feedback/ToastProvider";

function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}

export default App;
