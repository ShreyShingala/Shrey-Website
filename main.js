const menu = document.getElementById("menu");
const exit = document.getElementById("exit");
const contactLink = document.getElementById("contact")
const navLinks = document.querySelector(".navlinks")

function closenavbar(){

    navLinks.style.display = "none";
    menu.style.display = "block";
    exit.style.display = "none";

};

menu.addEventListener("click", () => {
    navLinks.style.display = "block";
    menu.style.display = "none";
    exit.style.display = "block";
})

exit.addEventListener("click", () => {
    closenavbar();
})


