// import React, { useState, useEffect } from 'react';
// import axios from 'axios';

// function Preferences() {
//     const [preferences, setPreferences] = useState({
//         leetcode: false,
//         codeforces: {
//             div1: false,
//             div3: false,
//             div4: false
//         }
//     });
//     const [message, setMessage] = useState('');

//     // 1) Fetch the user's preferences when the component mounts
//     useEffect(() => {
//         async function fetchPreferences() {
//             try {
//                 // GET request to /api/user-preferences
//                 const response = await axios.get('http://localhost:5001/api/user-preferences', {
//                     withCredentials: true
//                 });
//                 // response.data should look like:
//                 // { leetcode: true/false, codeforces: { div1: ..., div3: ..., div4: ... } }
//                 setPreferences(response.data);
//             } catch (error) {
//                 console.error("Error fetching preferences:", error);
//             }
//         }

//         fetchPreferences();
//     }, []);

//     // 2) Handle checkbox changes locally in state
//     const handleCheckboxChange = (event) => {
//         const { name, checked } = event.target;
//         if (name === 'leetcode') {
//             setPreferences({ ...preferences, leetcode: checked });
//         } else {
//             setPreferences({
//                 ...preferences,
//                 codeforces: { ...preferences.codeforces, [name]: checked }
//             });
//         }
//     };

//     // 3) Submit updated preferences to the server
//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         try {
//             // POST to /api/user/preferences
//             await axios.post(
//                 'http://localhost:5001/api/user/preferences',
//                 { reminderPreferences: preferences },
//                 { withCredentials: true }
//             );
//             setMessage('Preferences updated successfully.');
//         } catch (error) {
//             console.error("Error updating preferences:", error);
//             setMessage('Error updating preferences.');
//         }
//     };

//     return (
//         <div style={{ padding: '20px' }}>
//             <h1>User Preferences</h1>
//             <form onSubmit={handleSubmit}>
//                 <div style={{ marginBottom: '1rem' }}>
//                     <label>
//                         <input
//                             type="checkbox"
//                             name="leetcode"
//                             checked={preferences.leetcode}
//                             onChange={handleCheckboxChange}
//                         />
//                         &nbsp;Receive reminders for LeetCode contests
//                     </label>
//                 </div>
//                 <div style={{ marginBottom: '1rem' }}>
//                     <h3>Codeforces Contest Reminders</h3>
//                     <label>
//                         <input
//                             type="checkbox"
//                             name="div1"
//                             checked={preferences.codeforces.div1}
//                             onChange={handleCheckboxChange}
//                         />
//                         &nbsp;Div1
//                     </label>
//                     <br />
//                     <label>
//                         <input
//                             type="checkbox"
//                             name="div3"
//                             checked={preferences.codeforces.div3}
//                             onChange={handleCheckboxChange}
//                         />
//                         &nbsp;Div3
//                     </label>
//                     <br />
//                     <label>
//                         <input
//                             type="checkbox"
//                             name="div4"
//                             checked={preferences.codeforces.div4}
//                             onChange={handleCheckboxChange}
//                         />
//                         &nbsp;Div4
//                     </label>
//                 </div>
//                 <button type="submit" style={{ padding: '10px 20px' }}>
//                     Update Preferences
//                 </button>
//             </form>
//             {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
//         </div>
//     );
// }

// export default Preferences;

import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Preferences() {
    const [preferences, setPreferences] = useState({
        leetcode: false,
        codeforces: {
            div1: false,
            div3: false,
            div4: false
        }
    });
    const [message, setMessage] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(true);
    // We'll track if the user is logged in. If not, we show "Login first".

    // 1) Fetch the user's preferences when the component mounts
    useEffect(() => {
        async function fetchPreferences() {
            try {
                // GET request to /api/user-preferences
                const response = await axios.get('http://localhost:5001/api/user-preferences', {
                    withCredentials: true
                });
                // e.g. { leetcode: true/false, codeforces: { div1: ..., div3: ..., div4: ... } }
                setPreferences(response.data);
            } catch (error) {
                console.error("Error fetching preferences:", error);

                // If the server returns 401, the user isn't logged in
                if (error.response && error.response.status === 401) {
                    setIsLoggedIn(false);
                    setMessage('Please login first');
                }
            }
        }

        fetchPreferences();
    }, []);

    // 2) Handle checkbox changes locally in state
    const handleCheckboxChange = (event) => {
        const { name, checked } = event.target;
        if (name === 'leetcode') {
            setPreferences({ ...preferences, leetcode: checked });
        } else {
            setPreferences({
                ...preferences,
                codeforces: { ...preferences.codeforces, [name]: checked }
            });
        }
    };

    // 3) Submit updated preferences to the server
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // POST to /api/user/preferences
            await axios.post(
                'http://localhost:5001/api/user/preferences',
                { reminderPreferences: preferences },
                { withCredentials: true }
            );
            setMessage('Preferences updated successfully.');
        } catch (error) {
            console.error("Error updating preferences:", error);

            // If 401 on submit, user is not logged in
            if (error.response && error.response.status === 401) {
                setIsLoggedIn(false);
                setMessage('Please login first');
            } else {
                setMessage('Error updating preferences.');
            }
        }
    };

    // If user is not logged in, show a message and hide the form
    if (!isLoggedIn) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>User Preferences</h1>
                <p style={{ color: 'red' }}>{message || 'Please login first'}</p>
            </div>
        );
    }

    // If logged in, show the preferences form
    return (
        <div style={{ padding: '20px' }}>
            <h1>User Preferences</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        <input
                            type="checkbox"
                            name="leetcode"
                            checked={preferences.leetcode}
                            onChange={handleCheckboxChange}
                        />
                        &nbsp;Receive reminders for LeetCode contests
                    </label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <h3>Codeforces Contest Reminders</h3>
                    <label>
                        <input
                            type="checkbox"
                            name="div1"
                            checked={preferences.codeforces.div1}
                            onChange={handleCheckboxChange}
                        />
                        &nbsp;Div1
                    </label>
                    <br />
                    <label>
                        <input
                            type="checkbox"
                            name="div3"
                            checked={preferences.codeforces.div3}
                            onChange={handleCheckboxChange}
                        />
                        &nbsp;Div3
                    </label>
                    <br />
                    <label>
                        <input
                            type="checkbox"
                            name="div4"
                            checked={preferences.codeforces.div4}
                            onChange={handleCheckboxChange}
                        />
                        &nbsp;Div4
                    </label>
                </div>
                <button type="submit" style={{ padding: '10px 20px' }}>
                    Update Preferences
                </button>
            </form>
            {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
        </div>
    );
}

export default Preferences;

