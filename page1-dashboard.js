document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded. Running page1-dashboard.js");

  const COLOR_ACCENT = "cyan";
  const COLOR_ACCENT_HOVER = "#00ffff";
  const COLOR_GRAY = "#aaa";
  const COLOR_BG_DARK = "#333";
  const COLOR_BG_BODY = "#000";

  const dataPath = "../data/clean-jobs-enriched-csv-enriched.csv";

  d3.dsv(";", dataPath)
    .then((data) => {
      console.log(`Data loaded successfully from ${dataPath}!`, data[0]);

      // --- 1. Data Pre-processing ---
      const processedData = data.map((d) => {
        return {
          ...d,
          salary_value: d.salary_value ? +d.salary_value : null,
          hybrid_policy: d.hybrid_policy === "True",
          visa_sponsorship: d.visa_sponsorship === "True",
          technical_skills: parseListString(d.technical_skills),
          tools_used: parseListString(d.tools_used),
          domains: parseListString(d.domains),
          seniority_level: d.seniority_level || "Not specified",
          country: d.country || "Not specified",
          source: d.source || "N/A",
        };
      });

      console.log("Data processed. First item:", processedData[0]);

      const modalBackdrop = d3.select("#chart-modal-backdrop");
      const modalTitle = d3.select("#chart-modal-title");
      const modalContainer = d3.select("#chart-modal-container");
      const modalCloseBtn = d3.select("#chart-modal-close");

      // --- 2. Create Tooltip ---
      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "d3-tooltip");

      // --- 3. Run Visualization Functions ---
      console.log("Updating KPIs...");
      updateKPIs(processedData);

      console.log("Creating charts...");
      createTechSkillsChart(
        processedData,
        "#viz-tech-skills",
        tooltip,
        COLOR_ACCENT,
        COLOR_ACCENT_HOVER
      );
      createSalaryHistogram(
        processedData,
        "#viz-salary-dist",
        tooltip,
        COLOR_ACCENT,
        COLOR_ACCENT_HOVER
      );
      createTopToolsChart(
        processedData,
        "#viz-tools",
        tooltip,
        COLOR_ACCENT,
        COLOR_ACCENT_HOVER
      );
      createGeoChart(
        processedData,
        "#viz-geo",
        tooltip,
        COLOR_ACCENT,
        COLOR_ACCENT_HOVER
      );
      createDomainsChart(
        processedData,
        "#viz-domains",
        tooltip,
        COLOR_ACCENT,
        COLOR_ACCENT_HOVER
      );

      // Pie Charts
      createSeniorityChart(processedData, "#viz-seniority", tooltip);
      createPolicyPieChart(
        processedData,
        "hybrid_policy",
        "#viz-hybrid",
        tooltip,
        ["Hybrid", "On-site"],
        [COLOR_ACCENT, COLOR_BG_DARK]
      );
      createPolicyPieChart(
        processedData,
        "visa_sponsorship",
        "#viz-visa",
        tooltip,
        ["Visa OK", "Visa No"],
        [COLOR_ACCENT, COLOR_BG_DARK]
      );
      createSourceChart(processedData, "#viz-source", tooltip, [
        COLOR_ACCENT,
        COLOR_BG_DARK,
      ]);

      createTopTitles(processedData, "#chart-titles", tooltip);
      createTopCompanies(processedData, "#chart-companies", tooltip);
      setupModalListeners();
      console.log("All charts initialized.");
    })
    .catch((error) => {
      console.error(`Error loading data from ${dataPath}:`, error);
      alert(`Error: Could not load ${dataPath}. Check file name and location.`);
    });

  function parseListString(listString) {
    if (!listString || listString === "[]") return [];
    return listString
      .replace(/[\[\]']/g, "")
      .split(", ")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  const showTooltip = (event, d, content, tooltip) => {
    tooltip
      .style("opacity", 1)
      .html(content)
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY - 28 + "px");
  };

  const hideTooltip = (tooltip) => {
    tooltip.style("opacity", 0);
  };

  function aggregateData(data, column, isList = false) {
    const counts = new Map();
    data.forEach((d) => {
      const items = isList ? d[column] : [d[column]];
      items.forEach((item) => {
        if (item && item !== "[]" && item !== "Not specified") {
          counts.set(item, (counts.get(item) || 0) + 1);
        }
      });
    });
    return Array.from(counts, ([name, count]) => ({ name, count }));
  }

  function createLegend(containerSelector, data, colorScale) {
    const legendContainer = d3
      .select(containerSelector)
      .node()
      .parentNode.appendChild(document.createElement("div"));

    d3.select(legendContainer)
      .attr("class", "d3-legend")
      .selectAll(".legend-item")
      .data(data)
      .enter()
      .append("div")
      .attr("class", "legend-item")
      .html(
        (d) => `
                <div class="legend-swatch" style="background-color: ${colorScale(
                  d.name
                )}"></div>
                <span>${d.name} (${d.value})</span>
            `
      );
  }

  /** 1. KPIs */
  function updateKPIs(data) {
    d3.select("#kpi-total-value").text(data.length);
    const uniqueCompanies = new Set(data.map((d) => d.company).filter(Boolean));
    d3.select("#kpi-total-companies").text(uniqueCompanies.size);
    const annualSalaries = data
      .filter(
        (d) =>
          d.salary_type === "annual" &&
          d.salary_currency === "USD" &&
          d.salary_value > 1000
      )
      .map((d) => d.salary_value);
    const medianSalary = d3.median(annualSalaries);
    d3.select("#kpi-median-salary").text(
      medianSalary ? `$${(medianSalary / 1000).toFixed(0)}k` : "N/A"
    );
  }

  /**
   * 2. Generic Bar Chart (for Skills, Tools, Geo, Domains)
   */
  function createGenericBarChart(
    data,
    selector,
    tooltip,
    color,
    hoverColor,
    topN = 10
  ) {
    const aggregated = aggregateData(data.data, data.column, data.isList);
    const topData = aggregated
      .sort((a, b) => b.count - a.count)
      .slice(0, topN)
      .reverse();

    const margin = { top: 10, right: 30, bottom: 40, left: 120 };
    const vizElement = d3.select(selector);
    vizElement.html("");

    const width =
      vizElement.node().getBoundingClientRect().width -
      margin.left -
      margin.right;
    const height =
      vizElement.node().getBoundingClientRect().height -
      margin.top -
      margin.bottom;

    if (width <= 0 || height <= 0) return;

    const svg = vizElement
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const y = d3
      .scaleBand()
      .domain(topData.map((d) => d.name))
      .range([height, 0])
      .padding(0.1);
    const x = d3
      .scaleLinear()
      .domain([0, d3.max(topData, (d) => d.count)])
      .range([0, width]);

    svg
      .append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).tickSize(0))
      .select(".domain")
      .remove();
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(5));

    svg
      .selectAll(".bar")
      .data(topData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", (d) => y(d.name))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", 0)
      .attr("fill", color)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("fill", hoverColor);
        showTooltip(
          event,
          d,
          `<b>${d.name}</b><br>${d.count} mentions`,
          tooltip
        );
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget).attr("fill", color);
        hideTooltip(tooltip);
      })
      .transition()
      .duration(800)
      .attr("width", (d) => x(d.count));
  }

  function createTechSkillsChart(data, s, t, c, hc) {
    createGenericBarChart(
      { data, column: "technical_skills", isList: true },
      s,
      t,
      c,
      hc
    );
  }
  function createTopToolsChart(data, s, t, c, hc) {
    createGenericBarChart(
      { data, column: "tools_used", isList: true },
      s,
      t,
      c,
      hc
    );
  }
  function createGeoChart(data, s, t, c, hc) {
    createGenericBarChart(
      { data, column: "country", isList: false },
      s,
      t,
      c,
      hc
    );
  }
  function createDomainsChart(data, s, t, c, hc) {
    createGenericBarChart(
      { data, column: "domains", isList: true },
      s,
      t,
      c,
      hc
    );
  }

  /** 3. Salary Histogram */
  function createSalaryHistogram(data, selector, tooltip, color, hoverColor) {
    const annualSalaries = data
      .filter(
        (d) =>
          d.salary_type === "annual" &&
          d.salary_currency === "USD" &&
          d.salary_value > 20000 &&
          d.salary_value < 500000
      )
      .map((d) => d.salary_value);

    const margin = { top: 10, right: 30, bottom: 40, left: 50 };
    const vizElement = d3.select(selector);
    vizElement.html("");

    const width =
      vizElement.node().getBoundingClientRect().width -
      margin.left -
      margin.right;
    const height =
      vizElement.node().getBoundingClientRect().height -
      margin.top -
      margin.bottom;

    if (width <= 0 || height <= 0) return;

    const svg = vizElement
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain(d3.extent(annualSalaries))
      .range([0, width]);
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0, ${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(7)
          .tickFormat((d) => `$${d / 1000}k`)
      );

    const histogram = d3
      .histogram()
      .value((d) => d)
      .domain(x.domain())
      .thresholds(x.ticks(20));
    const bins = histogram(annualSalaries);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (d) => d.length)])
      .range([height, 0]);
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y));

    svg
      .selectAll("rect")
      .data(bins)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.x0) + 1)
      .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", color)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("fill", hoverColor);
        const content = `<b>$${(d.x0 / 1000).toFixed(0)}k - $${(
          d.x1 / 1000
        ).toFixed(0)}k</b><br>${d.length} jobs`;
        showTooltip(event, d, content, tooltip);
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget).attr("fill", color);
        hideTooltip(tooltip);
      })
      .transition()
      .duration(800)
      .attr("y", (d) => y(d.length))
      .attr("height", (d) => height - y(d.length));
  }

  /** 4. Generic Pie Chart */
  function createGenericPieChart(
    data,
    selector,
    tooltip,
    colorRange,
    innerRadius = 0.5
  ) {
    const pieData = d3
      .pie()
      .value((d) => d.value)
      .sort(null)(data);

    const vizElement = d3.select(selector);
    vizElement.html("");

    const width = vizElement.node().getBoundingClientRect().width;
    const height = vizElement.node().getBoundingClientRect().height;
    const radius = Math.min(width, height) / 2;

    const svg = vizElement
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const color = d3
      .scaleOrdinal()
      .domain(data.map((d) => d.name))
      .range(colorRange);
    const arc = d3
      .arc()
      .innerRadius(radius * innerRadius)
      .outerRadius(radius);

    svg
      .selectAll("path")
      .data(pieData)
      .enter()
      .append("path")
      .attr("fill", (d) => color(d.data.name))
      .attr("stroke", COLOR_BG_BODY)
      .style("stroke-width", "2px")
      .on("mouseover", (event, d) => {
        const percent = (
          (d.data.value / d3.sum(data, (d) => d.value)) *
          100
        ).toFixed(1);
        const content = `<b>${d.data.name}</b><br>${d.data.value} jobs (${percent}%)`;
        showTooltip(event, d, content, tooltip);
      })
      .on("mouseout", (event, d) => hideTooltip(tooltip))
      .transition()
      .duration(800)
      .attrTween("d", (d) => {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return (t) => arc(i(t));
      });
    /**
     * 1 Top 10 Job Titles
     */
    function createTopTitles(data, selector, tooltip) {
      // Constantes de votre code
      const margin = { top: 40, right: 30, bottom: 100, left: 100 };
      const width = 850 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const showTooltip = (event, d, content) => {
        tooltip
          .style("opacity", 1)
          .html(content)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      };
      const hideTooltip = () => {
        tooltip.style("opacity", 0);
      };

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
        .select(selector)
        .append("svg")
        .attr(
          "viewBox",
          `0 0 ${width + margin.left + margin.right} ${
            height + margin.top + margin.bottom
          }`
        )
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
          showTooltip(
            e,
            d,
            `<strong>${d.title}</strong><br>Offers: ${d.count}`
          );
        })
        .on("mousemove", (e) => {
          tooltip
            .style("left", e.pageX + 15 + "px")
            .style("top", e.pageY - 28 + "px");
        })
        .on("mouseout", function () {
          d3.select(this).attr("fill", "cyan");
          hideTooltip();
        })
        .transition()
        .duration(1000)
        .attr("width", (d) => xT(d.count));

      svgTitles.append("g").attr("class", "axis").call(d3.axisLeft(yT));
      svgTitles
        .append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xT));
    }

    /**
     * 2️ Top 10 Companies
     */
    function createTopCompanies(data, selector, tooltip) {
      const margin = { top: 40, right: 30, bottom: 100, left: 100 };
      const width = 850 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const showTooltip = (event, d, content) => {
        tooltip
          .style("opacity", 1)
          .html(content)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      };
      const hideTooltip = () => {
        tooltip.style("opacity", 0);
      };
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
        .select(selector)
        .append("svg")
        .attr(
          "viewBox",
          `0 0 ${width + margin.left + margin.right} ${
            height + margin.top + margin.bottom
          }`
        )
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

      // Barres
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
          showTooltip(
            e,
            d,
            `<strong>${d.company}</strong><br>Offers: ${d.count}`
          );
        })
        .on("mousemove", (e) => {
          // Utilise la position de la souris
          tooltip
            .style("left", e.pageX + 15 + "px")
            .style("top", e.pageY - 28 + "px");
        })
        .on("mouseout", function () {
          d3.select(this).attr("fill", "#db0bd1ff");
          hideTooltip();
        })
        .transition()
        .duration(1000)
        .attr("y", (d) => yC(d.count))
        .attr("height", (d) => height - yC(d.count));

      // Axes
      svgComp
        .append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xC))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
      svgComp.append("g").attr("class", "axis").call(d3.axisLeft(yC));
    }

    createLegend(selector, data, color);
  }

  function createPolicyPieChart(
    data,
    column,
    selector,
    tooltip,
    labels,
    colorRange
  ) {
    const trueCount = data.filter((d) => d[column] === true).length;
    const falseCount = data.length - trueCount;
    const pieData = [
      { name: labels[0], value: trueCount },
      { name: labels[1], value: falseCount },
    ];
    createGenericPieChart(pieData, selector, tooltip, colorRange);
  }

  function createSeniorityChart(data, selector, tooltip) {
    const aggregated = aggregateData(data, "seniority_level", false);
    const sorted = aggregated.sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5);
    const otherCount = sorted.slice(5).reduce((acc, d) => acc + d.count, 0);
    if (otherCount > 0) top5.push({ name: "Other", count: otherCount });

    const pieData = top5.map((d) => ({ name: d.name, value: d.count }));
    const colorRange = [
      COLOR_ACCENT,
      COLOR_GRAY,
      "#888",
      "#666",
      "#444",
      COLOR_BG_DARK,
    ];

    createGenericPieChart(pieData, selector, tooltip, colorRange, 0);
  }

  function createSourceChart(data, selector, tooltip, colorRange) {
    const aggregated = aggregateData(data, "source", false);
    const sorted = aggregated.sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, 1);
    if (top.length === 0) return;

    const otherCount = sorted.slice(1).reduce((acc, d) => acc + d.count, 0);
    const pieData = [
      { name: top[0].name, value: top[0].count },
      { name: "Other", value: otherCount },
    ];
    createGenericPieChart(pieData, selector, tooltip, colorRange);
  }
  /**
   * 1️ Top 10 Job Titles
   */
  function createTopTitles(data, selector, tooltip) {
    const margin = { top: 40, right: 30, bottom: 100, left: 100 };
    const width = 850 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const showTooltip = (event, d, content) => {
      tooltip
        .style("opacity", 1)
        .html(content)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    };
    const moveTooltip = (event) => {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    };
    const hideTooltip = () => {
      tooltip.style("opacity", 0);
    };

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
      .select(selector)
      .append("svg")
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
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

    // Barres
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
        showTooltip(e, d, `<strong>${d.title}</strong><br>Offers: ${d.count}`);
      })
      .on("mousemove", moveTooltip) // Utilise le helper existant
      .on("mouseout", function () {
        d3.select(this).attr("fill", "cyan");
        hideTooltip();
      })
      .transition()
      .duration(1000)
      .attr("width", (d) => xT(d.count));

    svgTitles.append("g").attr("class", "axis").call(d3.axisLeft(yT));
    svgTitles
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xT));
  }

  function createTopCompanies(data, selector, tooltip) {
    const margin = { top: 40, right: 30, bottom: 100, left: 100 };
    const width = 850 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const showTooltip = (event, d, content) => {
      tooltip
        .style("opacity", 1)
        .html(content)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    };
    const moveTooltip = (event) => {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    };
    const hideTooltip = () => {
      tooltip.style("opacity", 0);
    };

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
      .select(selector)
      .append("svg")
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
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
      .attr("fill", "#00ffff")
      .on("mouseover", function (e, d) {
        d3.select(this).attr("fill", "pink");
        showTooltip(
          e,
          d,
          `<strong>${d.company}</strong><br>Offers: ${d.count}`
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", function () {
        d3.select(this).attr("fill", "#00ffff");
        hideTooltip();
      })
      .transition()
      .duration(1000)
      .attr("y", (d) => yC(d.count))
      .attr("height", (d) => height - yC(d.count));

    svgComp
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xC))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");
    svgComp.append("g").attr("class", "axis").call(d3.axisLeft(yC));
  }

  function setupModalListeners() {
    const modalBackdrop = d3.select("#chart-modal-backdrop");
    const modalTitle = d3.select("#chart-modal-title");
    const modalContainer = d3.select("#chart-modal-container");
    const modalCloseBtn = d3.select("#chart-modal-close");

    d3.selectAll(".card.chart-card").on("click", function (event) {
      const card = d3.select(this);

      const title = card.select("h3").text();
      const svgToClone = card.select("svg").node();

      if (svgToClone) {
        const clonedSvg = svgToClone.cloneNode(true);

        modalContainer.html("");
        modalContainer.node().appendChild(clonedSvg);
        modalTitle.text(title);
        modalBackdrop.classed("hidden", false);
      }
    });

    modalCloseBtn.on("click", hideModal);
    modalBackdrop.on("click", function (event) {
      if (event.target === this) {
        hideModal();
      }
    });

    function hideModal() {
      modalBackdrop.classed("hidden", true);
      modalContainer.html("");
    }
  }
});
