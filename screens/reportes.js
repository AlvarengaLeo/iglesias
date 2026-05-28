/* global React, Icon, Badge, LineChart, BarChart, DonutChart, HBarChart, formatMoney */
// Reportes screen

const {
  useState: useStateR
} = React;
const ReportesScreen = ({
  onToast
}) => {
  const [tab, setTab] = useStateR('Resumen');
  const monthlyData = [{
    label: 'Sep',
    value: 5400
  }, {
    label: 'Oct',
    value: 6100
  }, {
    label: 'Nov',
    value: 5900
  }, {
    label: 'Dic',
    value: 7800
  }, {
    label: 'Ene',
    value: 6200
  }, {
    label: 'Feb',
    value: 5800
  }, {
    label: 'Mar',
    value: 7400
  }, {
    label: 'Abr',
    value: 6900
  }, {
    label: 'May',
    value: 8450
  }];
  const fundData = [{
    label: 'General',
    value: 28900
  }, {
    label: 'Construc.',
    value: 12400
  }, {
    label: 'Misiones',
    value: 6800
  }, {
    label: 'Jóvenes',
    value: 3200
  }, {
    label: 'Ayuda',
    value: 1900
  }];
  const methodData = [{
    label: 'Tarjeta',
    value: 22400,
    color: '#1F2B38'
  }, {
    label: 'ACH',
    value: 18900,
    color: '#8A6A4A'
  }, {
    label: 'Efectivo',
    value: 6800,
    color: '#B89A7A'
  }, {
    label: 'Cheque',
    value: 4100,
    color: '#5C7CB0'
  }];
  const topCampaigns = [{
    label: 'Fondo de construcción',
    value: 32400
  }, {
    label: 'Misiones 2026',
    value: 11200
  }, {
    label: 'Ayuda comunitaria',
    value: 1280
  }, {
    label: 'Retiro de matrimonios',
    value: 980
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header-text"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "page-greeting"
  }, "Reportes"), /*#__PURE__*/React.createElement("p", {
    className: "page-sub"
  }, "Consulta el comportamiento de las donaciones y campa\xF1as \xB7 A\xF1o fiscal 2026")), /*#__PURE__*/React.createElement("div", {
    className: "page-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 14
  }), " Enviar por email"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary",
    onClick: () => onToast({
      title: 'Reporte descargado',
      sub: 'estado-anual-2026.pdf'
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 14
  }), " Descargar PDF"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => onToast({
      title: 'Exportado a Excel',
      sub: 'reporte-donaciones-mayo.xlsx'
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "fileText",
    size: 14
  }), " Exportar Excel"))), /*#__PURE__*/React.createElement("div", {
    className: "filter-bar",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "filter-label"
  }, "Per\xEDodo"), /*#__PURE__*/React.createElement("button", {
    className: "pill-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar"
  }), " 1 ene 2026 \u2014 31 may 2026 ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown"
  })), /*#__PURE__*/React.createElement("span", {
    className: "filter-label",
    style: {
      marginLeft: 4
    }
  }, "Fondo"), /*#__PURE__*/React.createElement("button", {
    className: "pill-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder"
  }), " Todos los fondos ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown"
  })), /*#__PURE__*/React.createElement("span", {
    className: "filter-label",
    style: {
      marginLeft: 4
    }
  }, "Campa\xF1a"), /*#__PURE__*/React.createElement("button", {
    className: "pill-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "target"
  }), " Todas las campa\xF1as ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "refresh",
    size: 12
  }), " Actualizar")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-4",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dollar"
  }), " Total recibido"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "$53,200"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kpi-trend up"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrowUp",
    size: 10
  }), " +18%"), " vs per\xEDodo anterior")), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wallet"
  }), " Total neto"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "$51,840"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, "Despu\xE9s de comisiones \xB7 97.4%")), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users"
  }), " Donantes \xFAnicos"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "94"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, "12 nuevos este per\xEDodo")), /*#__PURE__*/React.createElement("div", {
    className: "kpi",
    style: {
      background: 'linear-gradient(135deg, #1F2B38, #2B3A4A)',
      color: '#fff',
      borderColor: 'transparent'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label",
    style: {
      color: 'rgba(255,255,255,0.7)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star"
  }), " Mayor recaudaci\xF3n"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value",
    style: {
      color: '#fff',
      fontSize: 18
    }
  }, "Fondo de construcci\xF3n"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta",
    style: {
      color: 'rgba(255,255,255,0.7)'
    }
  }, "$32,400 \xB7 61% del total de campa\xF1as"))), /*#__PURE__*/React.createElement("div", {
    className: "tabs-underline",
    style: {
      marginBottom: 16
    }
  }, ['Resumen', 'Fondos', 'Campañas', 'Donantes', 'Recibos'].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `tab-u ${tab === t ? 'active' : ''}`,
    onClick: () => setTab(t)
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card col-span-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Donaciones por mes"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "Tendencia \xB7 Sep 2025 \u2014 May 2026")), /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    icon: "arrowUp"
  }, "+18%")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: monthlyData,
    height: 260,
    accent: "#8A6A4A",
    selectedIndex: 8
  }))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-4",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      background: 'linear-gradient(135deg, #F4ECE2, #FFFFFF)',
      border: '1px solid #E8DBC8'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: 'var(--coffee)',
      color: '#fff',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkle",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--coffee)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }
  }, "Insight pastoral")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--text)',
      fontWeight: 500
    }
  }, "Este mes las donaciones crecieron ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--coffee)'
    }
  }, "+12%"), " en comparaci\xF3n con el mes anterior, impulsadas por los nuevos donantes recurrentes."))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: 'var(--info-bg)',
      color: 'var(--info)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }
  }, "Distribuci\xF3n")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--text)',
      fontWeight: 500
    }
  }, "El ", /*#__PURE__*/React.createElement("strong", null, "Fondo General"), " representa el ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--info)'
    }
  }, "58%"), " de las donaciones del per\xEDodo. Construcci\xF3n se acerca r\xE1pido con 23%."))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-12",
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card col-span-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", null, "Donaciones por fondo"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "Total por categor\xEDa")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(BarChart, {
    data: fundData,
    height: 220,
    accent: "#1F2B38",
    highlightIndex: 0
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card col-span-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", null, "M\xE9todos de pago")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement(DonutChart, {
    data: methodData,
    size: 140,
    label: "Recibido"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card col-span-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", null, "Top campa\xF1as")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement(HBarChart, {
    data: topCampaigns,
    color: "#8A6A4A"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "section-head",
    style: {
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement("h2", null, "Reportes disponibles"), /*#__PURE__*/React.createElement("span", {
    className: "desc"
  }, "Genera, descarga o env\xEDa por email")), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "table-wrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Reporte"), /*#__PURE__*/React.createElement("th", null, "Descripci\xF3n"), /*#__PURE__*/React.createElement("th", null, "\xDAltima generaci\xF3n"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: 260,
      textAlign: 'right'
    }
  }, "Acciones"))), /*#__PURE__*/React.createElement("tbody", null, [{
    name: 'Reporte mensual',
    desc: 'Resumen de donaciones y actividad del mes',
    last: 'Hoy · 09:14',
    icon: 'calendar'
  }, {
    name: 'Donaciones por fondo',
    desc: 'Desglose por cada fondo del período seleccionado',
    last: 'Hace 2 días',
    icon: 'folder'
  }, {
    name: 'Estado anual de contribuciones',
    desc: 'Recibo fiscal consolidado por donante · IRS',
    last: '31 ene 2026',
    icon: 'receipt'
  }, {
    name: 'Recibos enviados',
    desc: 'Historial de envíos y reenvíos de recibos',
    last: 'Hoy · 09:14',
    icon: 'mail'
  }, {
    name: 'Donantes recurrentes',
    desc: 'Lista de donantes con aportes mensuales/anuales activos',
    last: 'Hace 1 semana',
    icon: 'refresh'
  }, {
    name: 'Donaciones grandes',
    desc: 'Aportes mayores a $1,000 para seguimiento pastoral',
    last: 'Hace 3 días',
    icon: 'star'
  }].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: 'var(--coffee-bg)',
      color: 'var(--coffee)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: r.icon,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, r.name))), /*#__PURE__*/React.createElement("td", {
    className: "muted",
    style: {
      fontSize: 12
    }
  }, r.desc), /*#__PURE__*/React.createElement("td", {
    className: "muted",
    style: {
      fontSize: 12
    }
  }, r.last), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 12
  }), " Ver"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary",
    onClick: () => onToast({
      title: 'Reporte descargado',
      sub: r.name + '.pdf'
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 12
  }), " Descargar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-coffee",
    onClick: () => onToast({
      title: 'Reporte enviado',
      sub: 'Enviado al equipo de liderazgo'
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 12
  }), " Enviar"))))))))));
};
window.ReportesScreen = ReportesScreen;