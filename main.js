const menu = document.getElementById("menu");

const exit = document.getElementById("exit");

const contactLink = document.getElementById("contact");

const navLinks = document.querySelector(".navlinks");

const scrollelem = document.querySelectorAll(".js-scroll");
const scrollOffset = 100;

const elementInView = (el, offset = 0) => {
    const elementTop = el.getBoundingClientRect().top;
    return(
        elementTop <= ((window.innerHeight || document.documentElement.clientHeight) - scrollOffset)
    );
};
const displayScrollElement = (element) => {
    element.classList.add("scrolled");
};

const handleScrollAnimation = () => {
    scrollelem.forEach((el) => {

        if (elementInView(el, scrollOffset)){
        
            displayScrollElement(el);
        }

    })
}


window.addEventListener('scroll', () => {
    handleScrollAnimation();
  })

function closenavbar(){

    navLinks.style.display = "none";
    menu.style.display = "block";
    exit.style.display = "none";

};

menu.addEventListener("click", () => {
    navLinks.style.display = "block";
    menu.style.display = "none";
    exit.style.display = "block";
});

exit.addEventListener("click", () => {
    closenavbar();
});


