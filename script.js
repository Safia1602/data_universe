// Reveal on scroll
const revealSections = () => {
  document.querySelectorAll("section").forEach((sec) => {
    const rect = sec.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      sec.classList.add("reveal");
    }
  });
};
window.addEventListener("scroll", revealSections);
revealSections();

document.addEventListener("DOMContentLoaded", () => {
  const width = 900;
  const height = 600;
  const margin = { top: 40, right: 30, bottom: 120, left: 80 };

  const svg = d3
    .select("#bubbleChart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  d3.dsv(";", "clean-jobs-enriched-csv-enriched.csv").then((data) => {
    // Regrouper par entreprise et compter les offres
    const grouped = d3.rollups(
      data,
      (v) => v.length,
      (d) => d.company
    );

    // Convertir en tableau d’objets
    let companies = grouped.map(([company, count]) => ({ company, count }));

    // Trier et garder les 20 premières
    companies = companies
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, 20);

    // Échelles
    const x = d3
      .scaleBand()
      .domain(companies.map((d) => d.company))
      .range([0, width - margin.left - margin.right])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(companies, (d) => d.count)])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    svg.append("g").call(d3.axisLeft(y));

    // Barres
    svg
      .selectAll("rect")
      .data(companies)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.company))
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(0) - y(d.count))
      .attr("fill", "cyan")
      .attr("opacity", 0.8)
      .on("mouseover", function (e, d) {
        d3.select(this).attr("fill", "#FF69B4");
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.company}</strong><br>Offres : ${d.count}`);
      })
      .on("mousemove", (e) => {
        tooltip.style("left", e.pageX + 10 + "px");
        tooltip.style("top", e.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", "cyan");
        tooltip.style("opacity", 0);
      });

    // Label Y
    svg
      .append("text")
      .attr("x", -height / 3)
      .attr("y", -50)
      .attr("transform", "rotate(-90)")
      .style("text-anchor", "middle")
      .style("fill", "cyan")
      .text("Number of offers");

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("id", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(241, 6, 163, 0.9)")
      .style("padding", "6px 10px")
      .style("border-radius", "8px")
      .style("box-shadow", "0 2px 10px rgba(0,0,0,0.2)")
      .style("pointer-events", "none")
      .style("opacity", 0);
  });
});
// Curseur personnalisé
const cursor = document.querySelector(".cursor");
document.addEventListener("mousemove", (e) => {
  cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
});

// Effet de grossissement sur liens et boutons
document.querySelectorAll("a, button").forEach((el) => {
  el.addEventListener("mouseenter", () => {
    cursor.style.transform += " scale(1.8)";
  });
  el.addEventListener("mouseleave", () => {
    cursor.style.transform = cursor.style.transform.replace(" scale(1.8)", "");
  });
});

// Animation "reveal" des cartes au scroll
const revealCards = () => {
  document.querySelectorAll(".card").forEach((card) => {
    const rect = card.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      card.classList.add("reveal");
    }
  });
};
window.addEventListener("scroll", revealCards);
revealCards();

// ===== BACK TO TOP BUTTON =====
const backToTop = document.getElementById("backToTop");

// Affiche le bouton après un certain scroll
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTop.style.display = "block";
  } else {
    backToTop.style.display = "none";
  }
});

// Scroll fluide vers le haut au clic
backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
