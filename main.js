// React to create the main projects section

const projects = [
	{
		title: "Pokemon Scanner",
		img: "Images/pokemon.png",
		alt: "Pokemon Scanner Screenshot",
		desc: "Webapp that scans Pokemon cards using a YOLOv8 detector, OCR, and CLIP+FAISS for identification. Live demo and API available.",
		lang: "TypeScript, Python, YOLOv8, CLIP, FAISS",
		link: "https://github.com/ShreyShingala/Pokemon-Card-Scanning-Webapp"
	},
	{
		title: "LeReplacer (Chrome Extension)",
		img: "Images/lereplace.png",
		alt: "LeReplacer Screenshot",
		desc: "Chrome extension that detects faces and replaces them with LeBron James images; includes hand-tracking mini-game and a caption generator. Winner of Best Pitch @ Go On Hacks 2025.",
		lang: "JavaScript, Chrome Extension, Handtrack.js",
		link: "https://github.com/ShreyShingala?tab=repositories"
	},
	{
		title: "Pavlovian Human Trainer",
		img: "Images/pavlov.jpeg",
		alt: "Project 1 Screenshot",
		desc: "Uses negative reinforcement to train humans to hate brainrot by forcing you to translate brainrot terminology into normal english. Administers punishment to 4 of your senses (hurts your finger, loud noises, burning electronics smell, calls you stupid). Got top 5 at Hackclub's Scrapyard @ Austin, Texas, and winner of Scrappiest subcategory.",
		lang: "Python, Arduino, OpenCV, Tkinter",
		link: "https://github.com/ShreyShingala/ScrapyardTrainer"
	},
	{
		title: "Metoxid",
		img: "Images/metoxid.png",
		alt: "Metoxid Screenshot",
		desc: "A terminal-based metadata editor for images, built with C++ using Exiv2 and Ncurses libraries. Made in a group of 3.",
		lang: "C++, EXIV2, Ncurses",
		link: "https://github.com/doroshtapgh/metoxid"
	},
	{
		title: "Hydra",
		img: "Images/hydra.png",
		alt: "Hydra Screenshot",
		desc: "A fake \"virus\" made for April Fools. Opens popups and closing a popup will only create more popups, unless the correct password is inputted. Did I mention it survives taskmanager?",
		lang: "Python, Tkinter",
		link: "https://github.com/ShreyShingala/April-Fools-Virus"
	},
	{
		title: "Portfolio Website",
		img: "Images/website.png",
		alt: "Portfolio Website Screenshot",
		desc: "The website you are on right now! It's a personal portfolio website showcasing my projects and skills.",
		lang: "HTML, CSS, JavaScript, React",
		link: "https://github.com/ShreyShingala/Shrey-Website"
	},
	{
		title: "Command Line Browser",
		img: "Images/cmdlbrowser.png",
		alt: "Command Line Browser Screenshot",
		desc: "A terminal based web browser that fetches and displays web pages in the terminal. Features an AI powered productivity mode that forces you to stay productive.",
		lang: "Python, Selenium, BeautifulSoup",
		link: "https://github.com/ShreyShingala/CommandLineBrowser"
	},
	{
		title: "Sudoku Game and Solver",
		img: "Images/sudoku.png",
		alt: "Sudoku Game Screenshot",
		desc: "A simple Sudoku game and solver built using Python and Pygame. Has a user-friendly interface, real-time validation, and an efficient backtracking algorithm to solve puzzles. Used an API to generate boards.",
		lang: "Python, Pygame",
		link: "https://github.com/ShreyShingala/Sudoku"
	}
];

function ProjectsSection() {
	return (
		React.createElement('div', { id: 'projects-root' },
			projects.map((project, idx) =>
				React.createElement('div', { className: 'project', key: idx },
					React.createElement('div', { className: 'project-content' },
                        React.createElement('h3', null, project.title),
						React.createElement('img', { src: project.img, alt: project.alt }),
						React.createElement('p', { className: 'lang' }, project.lang)
					),
					React.createElement('div', { className: 'project-hover' },
                        React.createElement('p', { className: 'desc' }, project.desc),
						React.createElement(LinkToRepo, {href: project.link, imgSrc: "Images/github.png", imgAlt: "GitHub Logo" }, "View Repo")
					)
				)
			)
		)
	);
}


function LinkToRepo({ href, imgSrc, imgAlt, children}) {
	const [isDark, setIsDark] = React.useState(document.body.classList.contains('dark-mode'));
	React.useEffect(() => {
		function updateDarkMode() {
			setIsDark(document.body.classList.contains('dark-mode'));
		}
		window.addEventListener('storage', updateDarkMode);
		const observer = new MutationObserver(updateDarkMode);
		observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
		return () => {
			window.removeEventListener('storage', updateDarkMode);
			observer.disconnect();
		};
	}, []);
	const githubLogo = isDark ? 'Images/githubwhite.png' : imgSrc;
	return (
		React.createElement('a', { href, target: '_blank', className: 'repo-button' },
			React.createElement('img', { src: githubLogo, alt: imgAlt, style: { width: '30px', height: '30px', marginRight: '15px' } }),
			React.createElement('span', null, children)
		)
	);
}

if (window.React && window.ReactDOM) {
	ReactDOM.createRoot(document.getElementById('projects-root')).render(React.createElement(ProjectsSection));
}
