// ===== Effet reveal on scroll =====
const revealSections = () => {
  document.querySelectorAll(".card").forEach((sec) => {
    const rect = sec.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      sec.classList.add("visible");
    }
  });
};
window.addEventListener("scroll", revealSections);
revealSections();

// ===== Lancer quand le DOM est prêt =====
document.addEventListener("DOMContentLoaded", () => {
  const margin = { top: 40, right: 30, bottom: 100, left: 100 };
  const width = 850 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // ===== Tooltip global =====
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0,255,255,0.1)")
    .style("border", "1px solid cyan")
    .style("backdrop-filter", "blur(4px)")
    .style("padding", "6px 10px")
    .style("border-radius", "8px")
    .style("color", "#f5f5f5")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("font-size", "13px");

  // ===== Charger les données =====
  d3.dsv(";", "clean-jobs-enriched-csv-enriched.csv").then((data) => {
    // Nettoyage de base
    data = data.filter(
      (d) => d.title && d.company && d.location && d.date_posted
    );

    // ===============================
    // 1️⃣ Top 10 Job Titles
    // ===============================
    const titles = Array.from(
      d3.rollup(
        data,
        (v) => v.length,
        (d) => d.title
      )
    )
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, 10);

    const svgTitles = d3
      .select("#chart-titles")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xT = d3
      .scaleLinear()
      .domain([0, d3.max(titles, (d) => d.count)])
      .range([0, width]);
    const yT = d3
      .scaleBand()
      .domain(titles.map((d) => d.title))
      .range([0, height])
      .padding(0.2);

    svgTitles
      .selectAll("rect")
      .data(titles)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => yT(d.title))
      .attr("height", yT.bandwidth())
      .attr("width", 0)
      .attr("fill", "cyan")
      .attr("opacity", 0.8)
      .on("mouseover", function (e, d) {
        d3.select(this).attr("fill", "pink");
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.title}</strong><br>Offers: ${d.count}`);
      })
      .on("mousemove", (e) => {
        tooltip
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", "cyan");
        tooltip.style("opacity", 0);
      })
      .transition()
      .duration(1000)
      .attr("width", (d) => xT(d.count));

    svgTitles
      .append("g")
      .call(d3.axisLeft(yT))
      .selectAll("text")
      .attr("fill", "#aaa");
    svgTitles
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xT))
      .selectAll("text")
      .attr("fill", "#aaa");

    // ===============================
    // 2️⃣ Top 10 Companies
    // ===============================
    const companies = Array.from(
      d3.rollup(
        data,
        (v) => v.length,
        (d) => d.company
      )
    )
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, 10);

    const svgComp = d3
      .select("#chart-companies")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xC = d3
      .scaleBand()
      .domain(companies.map((d) => d.company))
      .range([0, width])
      .padding(0.2);
    const yC = d3
      .scaleLinear()
      .domain([0, d3.max(companies, (d) => d.count)])
      .range([height, 0]);

    svgComp
      .selectAll("rect")
      .data(companies)
      .enter()
      .append("rect")
      .attr("x", (d) => xC(d.company))
      .attr("y", height)
      .attr("width", xC.bandwidth())
      .attr("height", 0)
      .attr("fill", "#f809bcff")
      .on("mouseover", function (e, d) {
        d3.select(this).attr("fill", "pink");
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.company}</strong><br>Offers: ${d.count}`);
      })
      .on("mousemove", (e) => {
        tooltip
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", "#db0bd1ff");
        tooltip.style("opacity", 0);
      })
      .transition()
      .duration(1000)
      .attr("y", (d) => yC(d.count))
      .attr("height", (d) => height - yC(d.count));

    svgComp
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xC))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("fill", "#aaa");
    svgComp
      .append("g")
      .call(d3.axisLeft(yC))
      .selectAll("text")
      .attr("fill", "#aaa");

    // ===============================
    // 3️⃣ Top 10 Countries / Regions
    // ===============================
    // ===============================
    // 3️⃣ Top 10 Countries (new column)
    // ===============================
    const countries = Array.from(
      d3.rollup(
        data,
        (v) => v.length,
        (d) => d.country // ← ici on utilise la colonne country
      )
    )
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, 10);

    const svgCountries = d3
      .select("#chart-countries")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xCountry = d3
      .scaleBand()
      .domain(countries.map((d) => d.country))
      .range([0, width])
      .padding(0.2);

    const yCountry = d3
      .scaleLinear()
      .domain([0, d3.max(countries, (d) => d.count)])
      .range([height, 0]);

    svgCountries
      .selectAll("rect")
      .data(countries)
      .enter()
      .append("rect")
      .attr("x", (d) => xCountry(d.country))
      .attr("y", height)
      .attr("width", xCountry.bandwidth())
      .attr("height", 0)
      .attr("fill", "#3f0ad0ff")
      .on("mouseover", function (e, d) {
        d3.select(this).attr("fill", "pink");
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.country}</strong><br>Offers: ${d.count}`);
      })
      .on("mousemove", (e) => {
        tooltip
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", "#0839e9ff");
        tooltip.style("opacity", 0);
      })
      .transition()
      .duration(1000)
      .attr("y", (d) => yCountry(d.count))
      .attr("height", (d) => height - yCountry(d.count));

    svgCountries
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xCountry))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("fill", "#aaa");

    svgCountries
      .append("g")
      .call(d3.axisLeft(yCountry))
      .selectAll("text")
      .attr("fill", "#aaa");

    // ===============================
    // 5️⃣ Timeline (Jobs by Month)
    // ===============================
    const byMonth = Array.from(
      d3.rollup(
        data,
        (v) => v.length,
        (d) => d.date_posted.slice(0, 7)
      )
    )
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => d3.ascending(a.month, b.month));

    const svgTime = d3
      .select("#chart-timeline")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xTime = d3
      .scalePoint()
      .domain(byMonth.map((d) => d.month))
      .range([0, width]);
    const yTime = d3
      .scaleLinear()
      .domain([0, d3.max(byMonth, (d) => d.count)])
      .range([height, 0]);

    const line = d3
      .line()
      .x((d) => xTime(d.month))
      .y((d) => yTime(d.count))
      .curve(d3.curveMonotoneX);

    svgTime
      .append("path")
      .datum(byMonth)
      .attr("fill", "none")
      .attr("stroke", "cyan")
      .attr("stroke-width", 2)
      .attr("d", line);

    svgTime
      .selectAll("circle")
      .data(byMonth)
      .enter()
      .append("circle")
      .attr("cx", (d) => xTime(d.month))
      .attr("cy", (d) => yTime(d.count))
      .attr("r", 5)
      .attr("fill", "#df1394ff")
      .on("mouseover", function (e, d) {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.month}</strong><br>${d.count} offers`);
      })
      .on("mousemove", (e) => {
        tooltip
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 20 + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));

    svgTime
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xTime))
      .selectAll("text")
      .attr("fill", "#aaa")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end");
    svgTime
      .append("g")
      .call(d3.axisLeft(yTime))
      .selectAll("text")
      .attr("fill", "#aaa");
  });
});
