// // File: TypingRacer/scripts/dark-mode.js
// // This script toggles dark mode on and off when the button is clicked.
//                //event listener for DOM
// document.addEventListener("DOMContentLoaded", () => {
//   const toggleBtn = document.getElementById("theme-toggle");
//                       //event listener for button click
//   toggleBtn.addEventListener("click", () => {
//     document.body.classList.toggle("dark-mode");   //main function to toggle dark mode


//     // Update button text based on the current mode
//     if (document.body.classList.contains("dark-mode")) {
//       toggleBtn.textContent = "☀️ Light Mode";
//     } else {
//       toggleBtn.textContent = "🌙 Dark Mode";
//     }
//   });
// });

// scripts/dark-mode.js
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("theme-toggle");

  // 🔁 Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (toggleBtn) toggleBtn.textContent = "☀️ Light Mode";
  }

  // 🔘 Toggle logic
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-mode");

      // 💾 Save preference
      localStorage.setItem("theme", isDark ? "dark" : "light");

      // 🎯 Update button text
      toggleBtn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    });
  }
});
