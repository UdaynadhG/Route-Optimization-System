import { Outlet } from 'react-router-dom'


function RootLayout(){
    return(
        // <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <div>
                
                    <div style={{minHeight: "90vh"}}>
                        <Outlet/>
                    </div>
            </div>
        // </ClerkProvider>
    )
}

export default RootLayout;