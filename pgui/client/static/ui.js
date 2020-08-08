window.addEventListener("load", () => {
    document.querySelector("#query").addEventListener("submit", (e) => {
        let queryText = document.querySelector("#query-input").value;
        let encodedQuery = btoa(queryText);

        let controller = new AbortController();
        setTimeout(() => controller.abort(), 3000);

        fetch("/query", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({ query: encodedQuery }),
        }).then(async (response) => {
            let rows = await response.json();
            console.log(rows);
            let keys = Object.keys(rows[0])

            let table = document.createElement("table");

            let headerRow = document.createElement("tr");
            keys.forEach((key) => {
                let elt = document.createElement("th");
                elt.innerText = key;
                headerRow.appendChild(elt);
            });
            table.appendChild(headerRow);

            rows.forEach((row) => {
                let rowElt = document.createElement("tr");
                keys.forEach((key) => {
                    let elt = document.createElement("td");
                    elt.innerText = row[key]?.toString();
                    rowElt.appendChild(elt);
                });
                table.appendChild(rowElt);
            });

            let resultSection = document.querySelector(".results");
            resultSection.innerHTML = "";
            resultSection.appendChild(table);
        });
        e.preventDefault();
    })
})