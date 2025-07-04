console.log("[UMP REG] content.js is running");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("[UMP REG] Message received:", msg);

  if (msg.type === "REGISTER_SUBJECTS") {
    const { subjects } = msg;
    console.log("[UMP REG] Received subjects:", subjects);

    let completed = 0;
    const detailedResults = [];
    let hasError = false;

    subjects.forEach(({ subj, lectGrp, tutGrp }, idx) => {
      const formData = new URLSearchParams();
      formData.append("subject_code", subj);
      formData.append("lect_group", lectGrp);
      formData.append("tut_group", tutGrp);
      formData.append("repeat_subj", "");
      formData.append("reg_action", "REG");

      console.log(`[UMP REG] Sending subject #${idx + 1}:`, { subj, lectGrp, tutGrp });

      fetch("/or/CurrentSemester/action/add_subject.jsp", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        credentials: "include"
      })
        .then(async (res) => {
          const text = await res.text();

          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/html");

          const h1 = doc.querySelector("h1")?.textContent?.trim() || "";
          const h2 = doc.querySelector("h2")?.textContent?.trim() || "";
          const b = doc.querySelector("b")?.textContent?.trim() || "";
          const pText = [...doc.querySelectorAll("p")]
            .map(p => p.textContent.trim())
            .filter(line => line && !line.includes("Apache") && !line.includes("Tomcat"))
            .join("\n");

          const alertDivs = [...doc.querySelectorAll("div.alert, div.alert-info, div[class*='alert']")];
          const alertText = alertDivs
            .map(div => div.textContent.trim())
            .filter(text => text)
            .join("\n");

          let summary = [h1, h2, b, alertText, pText]
            .filter(Boolean)
            .join("\n")
            .trim();

          if (!summary) {
            summary = doc.body?.textContent?.trim().slice(0, 300) || "No readable response.";
          }

          const isFailure = alertText.toLowerCase().includes("sorry, there was error");
          const isSuccess = res.ok && !isFailure;

          if (!isSuccess) hasError = true;

          detailedResults.push({
            subj,
            status: isSuccess ? "success" : "fail",
            message: summary
          });

          completed++;
          if (completed === subjects.length) {
            sendResponse({
              status: hasError ? "error" : "success",
              results: detailedResults
            });
          }
        })
        .catch((err) => {
          console.error(`[UMP REG] Fetch failed for ${subj}:`, err);
          hasError = true;

          detailedResults.push({
            subj,
            status: "fail",
            message: `Fetch error - ${err.message}`
          });

          completed++;
          if (completed === subjects.length) {
            sendResponse({
              status: "error",
              results: detailedResults
            });
          }
        });
    });

    return true;
  }
});
