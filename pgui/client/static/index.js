window.addEventListener("load", () => {
    document.querySelector("#login-form").addEventListener("submit", (e) => {
        let username = document.querySelector("#login-username").value;
        let password = document.querySelector("#login-password").value;

        fetch("/login", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        }).then((result) => {
            if (result.status === 401) {
                alert("Bad credentials");
            } else {
                window.location.href = result.url;
            }
        })

        e.preventDefault();
    });
});