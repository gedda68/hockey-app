"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function EventsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Archive States
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Table States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "All">(10);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "startDate",
    direction: "asc",
  });

  useEffect(() => {
    fetch("/data/events.json")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => console.error("Error loading events:", err));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const themes = data?.themes || {};
  const defaultTheme = {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
  };

  // --- HELPERS ---
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const isUpcomingSoon = (startDateStr: string) => {
    const eventDate = new Date(startDateStr);
    const today = getToday();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    return eventDate >= today && eventDate <= nextWeek;
  };

  const formatToAU = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  };

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  // --- DATA PROCESSING ---
  const allEventsProcessed = useMemo(() => {
    if (!data?.events) return [];
    return data.events.map((event: any) => ({
      ...event,
      year: event.startDate ? event.startDate.split("-")[0] : "",
    }));
  }, [data]);

  const archiveOptions = useMemo(
    () => ({
      years: Array.from(new Set(allEventsProcessed.map((e) => e.year))).sort(),
      categories: Array.from(
        new Set(allEventsProcessed.map((e) => e.type))
      ).sort(),
      locations: Array.from(
        new Set(allEventsProcessed.map((e) => e.location))
      ).sort(),
    }),
    [allEventsProcessed]
  );

  const filteredAndSortedEvents = useMemo(() => {
    const today = getToday();
    let items = allEventsProcessed.filter(
      (event) => new Date(event.startDate) >= today
    );

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      items = items.filter(
        (event: any) =>
          event.name.toLowerCase().includes(s) ||
          event.location.toLowerCase().includes(s) ||
          event.type.toLowerCase().includes(s) ||
          event.year.includes(s)
      );
    }
    items.sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key])
        return sortConfig.direction === "asc" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key])
        return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [allEventsProcessed, searchTerm, sortConfig]);

  // --- EXPORTS ---
  const exportTableToExcel = () => {
    const exportData = filteredAndSortedEvents.map((e) => ({
      Year: e.year,
      Event: e.name,
      Category: e.type,
      Location: e.location,
      Date: formatToAU(e.startDate),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    XLSX.writeFile(wb, "Upcoming_Hockey_Schedule.xlsx");
  };

  const handleArchiveExport = () => {
    let toExport = allEventsProcessed;
    if (selectedYears.length > 0)
      toExport = toExport.filter((e) => selectedYears.includes(e.year));
    if (selectedCategories.length > 0)
      toExport = toExport.filter((e) => selectedCategories.includes(e.type));
    if (selectedLocations.length > 0)
      toExport = toExport.filter((e) => selectedLocations.includes(e.location));

    const exportData = toExport.map((e) => ({
      Year: e.year,
      Event: e.name,
      Category: e.type,
      Location: e.location,
      Date: e.startDate,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Archive");
    XLSX.writeFile(wb, "Full_History_Export.xlsx");
  };

  // --- PAGINATION ---
  const totalPages =
    itemsPerPage === "All"
      ? 1
      : Math.ceil(filteredAndSortedEvents.length / (itemsPerPage as number));
  const paginatedEvents = useMemo(() => {
    if (itemsPerPage === "All") return filteredAndSortedEvents;
    const startIndex = (currentPage - 1) * (itemsPerPage as number);
    return filteredAndSortedEvents.slice(
      startIndex,
      startIndex + (itemsPerPage as number)
    );
  }, [filteredAndSortedEvents, currentPage, itemsPerPage]);

  const startItem =
    (currentPage - 1) * (itemsPerPage === "All" ? 0 : itemsPerPage) + 1;
  const endItem =
    itemsPerPage === "All"
      ? filteredAndSortedEvents.length
      : Math.min(
          currentPage * (itemsPerPage as number),
          filteredAndSortedEvents.length
        );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-[#06054e]">
        LOADING SCHEDULE...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900 py-2 px-4">
      {/* HEADER HERO */}
      <div className="text-center mb-5 bg-[#66667e] p-2 rounded-lg mx-4">
        <h1 className="text-4xl font-extrabold sm:text-3xl text-yellow-200">
          Event Calendar
        </h1>
      </div>
      <div className="pb-3 text-left no-print">
        <Link
          href="/competitions"
          className="text-xs font-black uppercase text-slate-400 hover:text-red-600 transition-colors"
        >
          ← Back to Competitions
        </Link>
      </div>

      <main className="max-w-[1500px] mx-auto px-4">
        {/* UNIFIED TOOLBAR */}
        <div className="flex flex-col xl:flex-row gap-6 mb-6 items-center justify-between bg-gray-200 p-5 rounded-xl shadow-sm no-print">
          <div className="relative w-full xl:max-w-md">
            <input
              type="text"
              placeholder="Search future events..."
              className="input input-bordered w-full bg-slate-50 pl-10 font-bold focus:border-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-3.5 opacity-40">🔍</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8">
            <div className="hidden sm:block border-r border-slate-200 pr-6 text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                Results
              </p>
              <p className="text-xs font-bold text-slate-700 whitespace-nowrap">
                {filteredAndSortedEvents.length > 0
                  ? `${startItem}-${endItem} of ${filteredAndSortedEvents.length}`
                  : "0 Found"}
              </p>
            </div>

            <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-slate-400 text-center">
                  Limit
                </span>
                <select
                  className="select select-bordered select-sm font-black h-9 min-h-9"
                  value={itemsPerPage}
                  onChange={(e) =>
                    setItemsPerPage(
                      e.target.value === "All" ? "All" : Number(e.target.value)
                    )
                  }
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value="All">All</option>
                </select>
              </div>

              {itemsPerPage !== "All" && totalPages > 1 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 text-center">
                    Page
                  </span>
                  <div className="join border border-slate-200">
                    <button
                      className="join-item btn btn-sm bg-white"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                    >
                      ‹
                    </button>
                    <button className="join-item btn btn-sm bg-[#06054e] text-white pointer-events-none">
                      {currentPage}
                    </button>
                    <button
                      className="join-item btn btn-sm bg-white"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportTableToExcel}
                className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none font-black text-[10px] uppercase tracking-widest h-9 px-4"
              >
                📊 Excel
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn-sm bg-slate-300 hover:bg-slate-400 text-slate-600 border-none font-black text-[10px] uppercase tracking-widest h-9 px-4"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>

        {/* LIVE TABLE */}
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 mb-12">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-slate-50 text-[#06054e] uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th
                    onClick={() => requestSort("year")}
                    className="cursor-pointer py-5 pl-6 hover:bg-slate-100"
                  >
                    Year ↕
                  </th>
                  <th
                    onClick={() => requestSort("name")}
                    className="cursor-pointer hover:bg-slate-100"
                  >
                    Event ↕
                  </th>
                  <th
                    onClick={() => requestSort("type")}
                    className="cursor-pointer hover:bg-slate-100"
                  >
                    Category ↕
                  </th>
                  <th>Location</th>
                  <th
                    onClick={() => requestSort("startDate")}
                    className="cursor-pointer hover:bg-slate-100"
                  >
                    Date ↕
                  </th>
                  <th className="no-print text-center pr-6 italic">Sync</th>
                </tr>
              </thead>
              <tbody className="text-[13px] font-medium">
                {paginatedEvents.map((event, i) => {
                  const theme = themes[event.type] || defaultTheme;
                  const isSoon = isUpcomingSoon(event.startDate);
                  return (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 last:border-0 ${
                        isSoon ? "bg-red-50 border-l-4 border-l-red-600" : ""
                      }`}
                    >
                      <td className="font-black text-slate-400 pl-6">
                        {event.year}
                      </td>
                      <td className="font-bold">
                        <div className="flex items-center gap-2">
                          {isSoon && (
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                          )}
                          {/* FIXED LINK LOGIC BELOW */}
                          {event.link ? (
                            <Link
                              href={event.link}
                              target="_blank"
                              className="text-blue-600 underline hover:text-red-600 transition-colors decoration-blue-200"
                            >
                              {event.name}
                            </Link>
                          ) : (
                            event.name
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${theme.bg} ${theme.text} ${theme.border}`}
                        >
                          {event.type}
                        </span>
                      </td>
                      <td className="italic text-slate-600">
                        {event.location}
                      </td>
                      <td
                        className={`font-bold ${isSoon ? "text-red-700" : ""}`}
                      >
                        {formatToAU(event.startDate)}
                      </td>
                      <td className="text-center no-print pr-6 opacity-30">
                        📅
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM SECTION: LEGEND & ARCHIVE */}
        <div className="grid lg:grid-cols-2 gap-8 no-print">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-black uppercase tracking-tighter text-[#06054e] mb-6 border-b pb-4">
              Category Guide
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(themes).map(([type, styles]: [string, any]) => (
                <div key={type} className="flex flex-col gap-1">
                  <span
                    className={`w-fit px-2 py-0.5 rounded text-[10px] font-black uppercase border ${styles.bg} ${styles.text} ${styles.border}`}
                  >
                    {type}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {styles.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#06054e] rounded-3xl shadow-2xl overflow-hidden text-white border border-[#06054e] flex flex-col">
            <div className="p-8 border-b border-white/10 bg-black/20">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                History Archive
              </h2>
              <p className="text-blue-200 text-xs mt-1">
                Refine historical data points for export.
              </p>
            </div>
            <div className="p-8 space-y-6 flex-grow">
              <div>
                <label className="text-[10px] font-black uppercase text-blue-300 block mb-3">
                  Years
                </label>
                <div className="flex flex-wrap gap-2">
                  {archiveOptions.years.map((y) => (
                    <button
                      key={y}
                      onClick={() =>
                        setSelectedYears((prev) =>
                          prev.includes(y)
                            ? prev.filter((i) => i !== y)
                            : [...prev, y]
                        )
                      }
                      className={`btn btn-xs rounded-full font-bold border-none ${
                        selectedYears.includes(y)
                          ? "bg-red-600 text-white"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-blue-300 block mb-3">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {archiveOptions.categories.map((c) => (
                    <button
                      key={c}
                      onClick={() =>
                        setSelectedCategories((prev) =>
                          prev.includes(c)
                            ? prev.filter((i) => i !== c)
                            : [...prev, c]
                        )
                      }
                      className={`btn btn-xs rounded-full font-bold border-none ${
                        selectedCategories.includes(c)
                          ? "bg-blue-500 text-white"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-black/40 p-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedYears([]);
                  setSelectedCategories([]);
                  setSelectedLocations([]);
                }}
                className="text-[10px] font-black uppercase text-blue-300 hover:text-white transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleArchiveExport}
                className="btn bg-emerald-500 hover:bg-emerald-400 text-[#06054e] border-none font-black uppercase tracking-widest px-8"
              >
                📊 Export Archive
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
