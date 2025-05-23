// Code for the dynamic typing effect on the introduction text

const intro = [
    "Welcome to SmogSense - your interactive guide to understanding the unseen air pollution in Europe.",
    "Our website aims to offer an engaging exploration of air quality across Europe, showcasing the evolution of pollution levels over the past two decades and projecting future trends based on real-time data.",
    "Through intuitive visualizations, we empower you to understand the impact of air pollution and make informed decisions about the environment.",
    "Whether you're a scientist, policymaker, or a concerned citizen, SmogSense brings you the latest insights into air quality across Europe."
]

let currentIndex = 0;
let animationFrameRequest; 

function typeWriter(text, elementId, callback) {
    let i = 0;
    const element = document.getElementById(elementId);
    element.textContent = '';
    
    function typing() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            animationFrameRequest = setTimeout(typing, 50);
        } else if (callback) {
            animationFrameRequest = setTimeout(callback, 100);
        }
    }
    
    typing();
}

function writeIntro() {
    if (currentIndex < intro.length) {
        const text = intro[currentIndex];
        typeWriter(text, `p${currentIndex}`, () => {
            currentIndex++;
            writeIntro();
        });
    }
}

window.onbeforeunload = function () {
    window.scrollTo(0, 0);
}

writeIntro();