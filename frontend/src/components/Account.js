import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Account() {
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(true);

    useEffect(() => {
        async function fetchUserInfo() {
            try {
                // Fetch user account info
                const res = await axios.get('http://localhost:5001/api/user/info', {
                    withCredentials: true
                });
                setUserInfo(res.data);
            } catch (err) {
                console.error('Error fetching user info:', err);

                // If 401 error, user is not logged in
                if (err.response && err.response.status === 401) {
                    setIsLoggedIn(false);
                    setError('Please login first.');
                } else {
                    setError('Unable to load account info.');
                }
            }
        }
        fetchUserInfo();
    }, []);

    // If user is not logged in, show a message
    if (!isLoggedIn) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Account Info</h1>
                <p style={{ color: 'red' }}>{error}</p>
            </div>
        );
    }

    if (!userInfo) return <div>Loading...</div>;

    // If logged in, show account info
    return (
        <div style={{ padding: '20px' }}>
            <h1>Account Info</h1>
            <p><strong>Name:</strong> {userInfo.name}</p>
            <p><strong>Email:</strong> {userInfo.email}</p>
            <h3>Preferences:</h3>
            <ul>
                <li>LeetCode: {userInfo.reminderPreferences.leetcode ? 'Yes' : 'No'}</li>
                <li>Codeforces Div1: {userInfo.reminderPreferences.codeforces.div1 ? 'Yes' : 'No'}</li>
                <li>Codeforces Div3: {userInfo.reminderPreferences.codeforces.div3 ? 'Yes' : 'No'}</li>
                <li>Codeforces Div4: {userInfo.reminderPreferences.codeforces.div4 ? 'Yes' : 'No'}</li>
            </ul>
        </div>
    );
}

export default Account;
