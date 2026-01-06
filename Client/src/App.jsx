import Home from "../src/components/public/Home";
import AuthPage from "./components/public/AuthPage";
import {createBrowserRouter,RouterProvider} from 'react-router-dom'
import RootLayout from '../src/components/RootLayout.jsx'
import StopManage from '../src/components/private/StopManage.jsx'
import RouteMap from "./components/private/RouteMap.jsx";

function App() {
  let browObj = createBrowserRouter([
    {
      path: "",
      element: <RootLayout />,
      children: [
        {
          index: true,
          element: <Home />
        },
        {
          path: "auth",
          element: <AuthPage />
        },
        {
          path: "stop-manage",
          element: <StopManage />
        },
        {
          path: "RouteMap",
          element: <RouteMap />
        }
      ]
    }
  ]);

  return <RouterProvider router={browObj} />;
}


export default App;
