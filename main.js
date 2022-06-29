const menu = document.getElementById("menu");

const exit = document.getElementById("exit");

const contactLink = document.getElementById("contact");

const navLinks = document.querySelector(".navlinks");

const skills = document.getElementById("skills")

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
  });

function contactclick(){

    navLinks.style.display = "none";
    menu.style.display = "block";
    exit.style.display = "none";
    scrollelem.forEach((el) => {
        console.log("running")
        el.classList.add("scrolled");

    })

};

function expand(name){

    const ExpandEl = document.getElementById(name);
    ExpandEl.classList.add("enlarge");
    skills.classList.add("enlarge");

};

function shrink(name){
    const ExpandEl = document.getElementById(name);
    ExpandEl.classList.remove("enlarge");
    skills.classList.remove('enlarge')
}

menu.addEventListener("click", () => {
    navLinks.style.display = "block";
    menu.style.display = "none";
    exit.style.display = "block";
});

exit.addEventListener("click", () => {
    navLinks.style.display = "none";
    menu.style.display = "block";
    exit.style.display = "none";
});
