/* global React, Icon, Badge, formatMoney */
// Donaciones screen

const {
  useState: useStateD
} = React;
const DONATIONS = [{
  id: 1,
  donor: 'María González',
  initials: 'MG',
  tone: 'navy',
  amount: 250,
  fund: 'Fondo General',
  freq: 'Mensual',
  method: 'ACH',
  status: 'Pagada',
  receipt: 'Enviado',
  date: '23 may 2026',
  stripeId: 'pi_3OqL2xH...'
}, {
  id: 2,
  donor: 'Lucía Hernández',
  initials: 'LH',
  tone: 'coffee',
  amount: 500,
  fund: 'Construcción',
  freq: 'Única',
  method: 'Tarjeta',
  status: 'Pagada',
  receipt: 'Enviado',
  date: '23 may 2026',
  stripeId: 'pi_3OqK8mF...'
}, {
  id: 3,
  donor: 'Carlos Méndez',
  initials: 'CM',
  tone: 'navy',
  amount: 100,
  fund: 'Misiones 2026',
  freq: 'Mensual',
  method: 'ACH',
  status: 'Pendiente',
  receipt: 'Pendiente',
  date: '22 may 2026'
}, {
  id: 4,
  donor: 'José Antonio Vargas',
  initials: 'JV',
  tone: 'navy',
  amount: 200,
  fund: 'Fondo General',
  freq: 'Única',
  method: 'Efectivo',
  status: 'Pagada',
  receipt: 'Generado',
  date: '21 may 2026'
}, {
  id: 5,
  donor: 'Familia Ortega',
  initials: 'FO',
  tone: 'coffee',
  amount: 400,
  fund: 'Fondo General',
  freq: 'Mensual',
  method: 'Stripe',
  status: 'Pagada',
  receipt: 'Enviado',
  date: '21 may 2026'
}, {
  id: 6,
  donor: 'Pedro Castillo',
  initials: 'PC',
  tone: 'navy',
  amount: 75,
  fund: 'Ayuda comunitaria',
  freq: 'Única',
  method: 'Cheque',
  status: 'Pagada',
  receipt: 'Reenviado',
  date: '20 may 2026'
}, {
  id: 7,
  donor: 'Ana Torres',
  initials: 'AT',
  tone: 'coffee',
  amount: 150,
  fund: 'Misiones 2026',
  freq: 'Única',
  method: 'Tarjeta',
  status: 'Fallida',
  receipt: 'Fallido',
  date: '19 may 2026'
}, {
  id: 8,
  donor: 'Sofía Mendoza',
  initials: 'SM',
  tone: 'navy',
  amount: 50,
  fund: 'Fondo General',
  freq: 'Única',
  method: 'Tarjeta',
  status: 'Pagada',
  receipt: 'Enviado',
  date: '18 may 2026'
}, {
  id: 9,
  donor: 'Roberto Salinas',
  initials: 'RS',
  tone: 'navy',
  amount: 1200,
  fund: 'Construcción',
  freq: 'Anual',
  method: 'ACH',
  status: 'Pagada',
  receipt: 'Enviado',
  date: '15 may 2026'
}, {
  id: 10,
  donor: 'Lucía Hernández',
  initials: 'LH',
  tone: 'coffee',
  amount: 200,
  fund: 'Fondo General',
  freq: 'Mensual',
  method: 'Tarjeta',
  status: 'Reembolsada',
  receipt: 'Generado',
  date: '12 may 2026'
}];
const DonacionesScreen = ({
  onToast
}) => {
  const [tab, setTab] = useStateD('Todas');
  const [selected, setSelected] = useStateD(null);
  const [showCampaignModal, setShowCampaignModal] = useStateD(false);
  const [showRegisterDonation, setShowRegisterDonation] = useStateD(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header-text"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "page-greeting"
  }, "Donaciones"), /*#__PURE__*/React.createElement("p", {
    className: "page-sub"
  }, "Gestiona aportes, fondos, campa\xF1as y recibos \xB7 Mayo 2026")), /*#__PURE__*/React.createElement("div", {
    className: "page-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "receipt",
    size: 14
  }), " Ver recibos"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary",
    onClick: () => setShowCampaignModal(true)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "target",
    size: 14
  }), " Crear campa\xF1a"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setShowRegisterDonation(true)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " Registrar donaci\xF3n"))), /*#__PURE__*/React.createElement("div", {
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
  }), " Total recibido este mes"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "$8,450"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kpi-trend up"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrowUp",
    size: 10
  }), " +12%"), " vs mes anterior")), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "refresh"
  }), " Recurrentes activas"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "48"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, "$3,840 mensuales programados")), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock"
  }), " Donaciones pendientes"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "3"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "warning",
    dot: true
  }, "$350 en proceso"))), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "receipt"
  }), " Recibos generados"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "126"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "muted"
  }, "120 enviados \xB7 6 pendientes")))), /*#__PURE__*/React.createElement("div", {
    className: "filter-bar",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "filter-label"
  }, "Filtros"), /*#__PURE__*/React.createElement("button", {
    className: "pill-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar"
  }), " Mayo 2026 ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown"
  })), /*#__PURE__*/React.createElement("button", {
    className: "pill-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder"
  }), " Fondo: Todos ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown"
  })), /*#__PURE__*/React.createElement("button", {
    className: "pill-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "target"
  }), " Campa\xF1a: Todas ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown"
  })), /*#__PURE__*/React.createElement("button", {
    className: "pill-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "creditCard"
  }), " M\xE9todo: Todos ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown"
  })), /*#__PURE__*/React.createElement("button", {
    className: "pill-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check"
  }), " Estado: Todos ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "input-wrap",
    style: {
      width: 240
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search"
  }), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "Buscar donaci\xF3n..."
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, ['Todas', 'Recurrentes', 'Campañas', 'Recibos'].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `tab ${tab === t ? 'active' : ''}`,
    onClick: () => setTab(t)
  }, t, /*#__PURE__*/React.createElement("span", {
    className: "tab-count"
  }, t === 'Todas' ? 126 : t === 'Recurrentes' ? 48 : t === 'Campañas' ? 3 : 126)))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 12
  }), " Exportar")), tab === 'Todas' || tab === 'Recurrentes' ? /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "table-wrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: 32
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox"
  })), /*#__PURE__*/React.createElement("th", null, "Donante"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Monto"), /*#__PURE__*/React.createElement("th", null, "Fondo / Campa\xF1a"), /*#__PURE__*/React.createElement("th", null, "Frecuencia"), /*#__PURE__*/React.createElement("th", null, "M\xE9todo"), /*#__PURE__*/React.createElement("th", null, "Estado"), /*#__PURE__*/React.createElement("th", null, "Recibo"), /*#__PURE__*/React.createElement("th", null, "Fecha"))), /*#__PURE__*/React.createElement("tbody", null, DONATIONS.filter(d => tab === 'Todas' || d.freq !== 'Única').map(d => /*#__PURE__*/React.createElement("tr", {
    key: d.id,
    className: selected?.id === d.id ? 'selected' : '',
    onClick: () => setSelected(d)
  }, /*#__PURE__*/React.createElement("td", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox"
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "person-cell"
  }, /*#__PURE__*/React.createElement("div", {
    className: `avatar ${d.tone === 'coffee' ? 'coffee' : 'navy'}`
  }, d.initials), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, d.donor))), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'right',
      fontWeight: 700,
      fontFeatureSettings: '"tnum"'
    }
  }, formatMoney(d.amount)), /*#__PURE__*/React.createElement("td", null, d.fund), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(FreqBadge, {
    freq: d.freq
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(MethodBadge, {
    method: d.method
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StatusBadge, {
    status: d.status
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(ReceiptBadge, {
    receipt: d.receipt
  })), /*#__PURE__*/React.createElement("td", {
    className: "muted",
    style: {
      fontSize: 12
    }
  }, d.date)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderTop: '1px solid var(--border-soft)',
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Mostrando 1\u201310 de 126 donaciones \xB7 Total filtrado: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, "$3,125")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevronLeft",
    size: 12
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, "1"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-primary"
  }, "2"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, "3"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevronRight",
    size: 12
  }))))) : tab === 'Campañas' ? /*#__PURE__*/React.createElement(CampaignsView, {
    onCreate: () => setShowCampaignModal(true)
  }) : /*#__PURE__*/React.createElement(ReceiptsView, {
    onToast: onToast
  }), selected && /*#__PURE__*/React.createElement(DonationDrawer, {
    donation: selected,
    onClose: () => setSelected(null),
    onToast: onToast
  }), showCampaignModal && /*#__PURE__*/React.createElement(CampaignModal, {
    onClose: () => setShowCampaignModal(false),
    onCreate: () => {
      setShowCampaignModal(false);
      onToast({
        title: 'Campaña creada',
        sub: 'Ahora puedes activarla o publicarla en el portal.'
      });
    }
  }), showRegisterDonation && /*#__PURE__*/React.createElement(RegisterDonationModal, {
    onClose: () => setShowRegisterDonation(false),
    onCreate: () => {
      setShowRegisterDonation(false);
      onToast({
        title: 'Donación registrada correctamente',
        sub: 'Se generó automáticamente el recibo.'
      });
    }
  }));
};
const FreqBadge = ({
  freq
}) => {
  const map = {
    Única: 'muted',
    Mensual: 'navy',
    Anual: 'coffee'
  };
  return /*#__PURE__*/React.createElement(Badge, {
    tone: map[freq]
  }, freq);
};
const MethodBadge = ({
  method
}) => {
  const map = {
    Tarjeta: 'creditCard',
    ACH: 'wallet',
    Efectivo: 'dollar',
    Cheque: 'fileText',
    Stripe: 'creditCard'
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      color: 'var(--text)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: map[method] || 'wallet',
    size: 13
  }), method);
};
const StatusBadge = ({
  status
}) => {
  const map = {
    Pagada: 'success',
    Pendiente: 'warning',
    Fallida: 'error',
    Reembolsada: 'muted'
  };
  return /*#__PURE__*/React.createElement(Badge, {
    tone: map[status],
    dot: true
  }, status);
};
const ReceiptBadge = ({
  receipt
}) => {
  const map = {
    Enviado: 'success',
    Generado: 'navy',
    Reenviado: 'coffee',
    Pendiente: 'warning',
    Fallido: 'error'
  };
  return /*#__PURE__*/React.createElement(Badge, {
    tone: map[receipt]
  }, receipt);
};
const DonationDrawer = ({
  donation: d,
  onClose,
  onToast
}) => /*#__PURE__*/React.createElement("div", {
  className: "drawer-overlay",
  onClick: onClose
}, /*#__PURE__*/React.createElement("div", {
  className: "drawer",
  onClick: e => e.stopPropagation()
}, /*#__PURE__*/React.createElement("div", {
  className: "drawer-header"
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: 4
  }
}, "Donaci\xF3n #", (2024000 + d.id).toLocaleString()), /*#__PURE__*/React.createElement("h3", {
  style: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em'
  }
}, formatMoney(d.amount)), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6,
    marginTop: 8
  }
}, /*#__PURE__*/React.createElement(StatusBadge, {
  status: d.status
}), /*#__PURE__*/React.createElement(ReceiptBadge, {
  receipt: d.receipt
}))), /*#__PURE__*/React.createElement("button", {
  className: "icon-btn",
  onClick: onClose
}, /*#__PURE__*/React.createElement(Icon, {
  name: "x"
}))), /*#__PURE__*/React.createElement("div", {
  className: "drawer-body",
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  }
}, /*#__PURE__*/React.createElement(DSection, {
  title: "Donante"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    background: 'var(--bg)',
    borderRadius: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  className: `avatar ${d.tone === 'coffee' ? 'coffee' : 'navy'}`
}, d.initials), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600
  }
}, d.donor), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)'
  }
}, d.donor.toLowerCase().replace(/ /g, '.'), "@gmail.com")), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-ghost"
}, "Ver perfil ", /*#__PURE__*/React.createElement(Icon, {
  name: "arrowRight",
  size: 12
})))), /*#__PURE__*/React.createElement(DSection, {
  title: "Detalles del aporte"
}, /*#__PURE__*/React.createElement(Row, {
  label: "Fondo / Campa\xF1a",
  value: d.fund
}), /*#__PURE__*/React.createElement(Row, {
  label: "Frecuencia",
  value: /*#__PURE__*/React.createElement(FreqBadge, {
    freq: d.freq
  })
}), /*#__PURE__*/React.createElement(Row, {
  label: "M\xE9todo de pago",
  value: /*#__PURE__*/React.createElement(MethodBadge, {
    method: d.method
  })
}), /*#__PURE__*/React.createElement(Row, {
  label: "Estado del pago",
  value: /*#__PURE__*/React.createElement(StatusBadge, {
    status: d.status
  })
}), /*#__PURE__*/React.createElement(Row, {
  label: "Fecha",
  value: d.date
}), d.stripeId && /*#__PURE__*/React.createElement(Row, {
  label: "ID de Stripe",
  value: /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, d.stripeId)
})), /*#__PURE__*/React.createElement(DSection, {
  title: "Recibo de contribuci\xF3n"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 14,
    background: 'var(--bg)',
    borderRadius: 12,
    border: '1px solid var(--border-soft)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'var(--coffee-bg)',
    color: 'var(--coffee)',
    display: 'grid',
    placeItems: 'center'
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "receipt"
})), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600,
    fontSize: 13
  }
}, "Recibo #2024-", String(d.id).padStart(3, '0')), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)'
  }
}, d.receipt, " a ", d.donor.toLowerCase().replace(/ /g, '.'), "@gmail.com"))), /*#__PURE__*/React.createElement(ReceiptBadge, {
  receipt: d.receipt
})), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap'
  }
}, /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-secondary"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "eye",
  size: 12
}), " Ver recibo"), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-secondary"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "download",
  size: 12
}), " PDF"), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-coffee",
  onClick: () => onToast({
    title: 'Recibo reenviado',
    sub: `Enviado a ${d.donor.toLowerCase().replace(/ /g, '.')}@gmail.com`
  })
}, /*#__PURE__*/React.createElement(Icon, {
  name: "send",
  size: 12
}), " Reenviar")))), /*#__PURE__*/React.createElement(DSection, {
  title: "Historial de env\xEDos del recibo"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'var(--bg)',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid var(--border-soft)'
  }
}, /*#__PURE__*/React.createElement("table", {
  className: "table",
  style: {
    fontSize: 12
  }
}, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Fecha"), /*#__PURE__*/React.createElement("th", null, "Correo"), /*#__PURE__*/React.createElement("th", null, "Motivo"), /*#__PURE__*/React.createElement("th", null, "Por"))), /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "23 may"), /*#__PURE__*/React.createElement("td", null, d.donor.toLowerCase().replace(/ /g, '.'), "@gmail.com"), /*#__PURE__*/React.createElement("td", null, "Env\xEDo original"), /*#__PURE__*/React.createElement("td", null, "Sistema")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "24 may"), /*#__PURE__*/React.createElement("td", null, d.donor.toLowerCase().replace(/ /g, '.'), "@gmail.com"), /*#__PURE__*/React.createElement("td", null, "Donante perdi\xF3 el recibo"), /*#__PURE__*/React.createElement("td", null, "Pastor Miguel")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "26 may"), /*#__PURE__*/React.createElement("td", null, "contador@iglesiacr.org"), /*#__PURE__*/React.createElement("td", null, "Solicitud del contador"), /*#__PURE__*/React.createElement("td", null, "Tesorera Ana"))))))), /*#__PURE__*/React.createElement("div", {
  className: "drawer-foot"
}, /*#__PURE__*/React.createElement("button", {
  className: "btn btn-secondary"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "refresh",
  size: 14
}), " Ver historial"), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-primary"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "edit",
  size: 14
}), " Editar"))));
const Row = ({
  label,
  value
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-soft)'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 12,
    color: 'var(--muted)'
  }
}, label), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 13,
    fontWeight: 500
  }
}, value));
const DSection = ({
  title,
  children
}) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 10
  }
}, title), children);
const CampaignsView = ({
  onCreate
}) => {
  const campaigns = [{
    name: 'Fondo de construcción',
    desc: 'Para la ampliación del santuario y nuevo salón infantil.',
    goal: 50000,
    raised: 32400,
    status: 'Activa',
    end: '31 dic 2026'
  }, {
    name: 'Misiones 2026',
    desc: 'Apoyo a misioneros en Centroamérica y proyecto Honduras.',
    goal: 12000,
    raised: 11200,
    status: 'Cerca de meta',
    end: '30 jul 2026'
  }, {
    name: 'Ayuda comunitaria',
    desc: 'Banco de alimentos y útiles escolares para familias.',
    goal: 5000,
    raised: 1280,
    status: 'Activa',
    end: '15 ago 2026'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 4px',
      fontSize: 15,
      fontWeight: 700
    }
  }, "Campa\xF1as activas"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, "3 campa\xF1as en curso \xB7 $44,880 recaudados en total")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: onCreate
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " Crear campa\xF1a")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-3"
  }, campaigns.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "campaign-card",
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "campaign-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "campaign-name",
    style: {
      fontSize: 15
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)',
      marginTop: 4,
      lineHeight: 1.4
    }
  }, c.desc))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      fontFeatureSettings: '"tnum"'
    }
  }, formatMoney(c.raised)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "de ", formatMoney(c.goal))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: 'var(--coffee)'
    }
  }, Math.round(c.raised / c.goal * 100), "%")), /*#__PURE__*/React.createElement("div", {
    className: "progress thick"
  }, /*#__PURE__*/React.createElement("div", {
    className: "progress-bar",
    style: {
      width: `${c.raised / c.goal * 100}%`,
      background: c.status === 'Cerca de meta' ? 'var(--success)' : 'var(--coffee)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: c.status === 'Cerca de meta' ? 'warning' : 'success',
    dot: true
  }, c.status), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "Cierra \xB7 ", c.end)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary btn-sm",
    style: {
      width: '100%',
      justifyContent: 'center'
    }
  }, "Ver detalles")))));
};
const ReceiptsView = ({
  onToast
}) => /*#__PURE__*/React.createElement("div", {
  className: "card"
}, /*#__PURE__*/React.createElement("div", {
  className: "table-wrap"
}, /*#__PURE__*/React.createElement("table", {
  className: "table"
}, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Recibo"), /*#__PURE__*/React.createElement("th", null, "Donante"), /*#__PURE__*/React.createElement("th", {
  style: {
    textAlign: 'right'
  }
}, "Monto"), /*#__PURE__*/React.createElement("th", null, "Estado"), /*#__PURE__*/React.createElement("th", null, "Fecha de env\xEDo"), /*#__PURE__*/React.createElement("th", null, "Reenv\xEDos"), /*#__PURE__*/React.createElement("th", {
  style: {
    width: 160,
    textAlign: 'right'
  }
}, "Acciones"))), /*#__PURE__*/React.createElement("tbody", null, DONATIONS.map((d, i) => /*#__PURE__*/React.createElement("tr", {
  key: d.id
}, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
  className: "mono"
}, "#2024-", String(d.id).padStart(3, '0'))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
  className: "person-cell"
}, /*#__PURE__*/React.createElement("div", {
  className: `avatar sm ${d.tone === 'coffee' ? 'coffee' : 'navy'}`
}, d.initials), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 600
  }
}, d.donor))), /*#__PURE__*/React.createElement("td", {
  style: {
    textAlign: 'right',
    fontWeight: 700,
    fontFeatureSettings: '"tnum"'
  }
}, formatMoney(d.amount)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(ReceiptBadge, {
  receipt: d.receipt
})), /*#__PURE__*/React.createElement("td", {
  className: "muted",
  style: {
    fontSize: 12
  }
}, d.date), /*#__PURE__*/React.createElement("td", {
  className: "muted",
  style: {
    fontSize: 12
  }
}, i % 4 === 0 ? '2 veces' : i % 5 === 0 ? '1 vez' : '—'), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
  className: "row-actions",
  style: {
    justifyContent: 'flex-end'
  }
}, /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-ghost"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "eye",
  size: 14
})), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-ghost"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "download",
  size: 14
})), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-ghost",
  onClick: () => onToast({
    title: 'Recibo reenviado',
    sub: `Enviado a ${d.donor}`
  })
}, /*#__PURE__*/React.createElement(Icon, {
  name: "send",
  size: 14
}))))))))));
const CampaignModal = ({
  onClose,
  onCreate
}) => /*#__PURE__*/React.createElement("div", {
  className: "modal-overlay",
  onClick: onClose
}, /*#__PURE__*/React.createElement("div", {
  className: "modal modal-lg",
  onClick: e => e.stopPropagation()
}, /*#__PURE__*/React.createElement("div", {
  className: "modal-header"
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Crear campa\xF1a"), /*#__PURE__*/React.createElement("p", null, "Define una meta de recaudaci\xF3n temporal con su propio recibo y p\xE1gina p\xFAblica.")), /*#__PURE__*/React.createElement("button", {
  className: "icon-btn",
  onClick: onClose
}, /*#__PURE__*/React.createElement(Icon, {
  name: "x"
}))), /*#__PURE__*/React.createElement("div", {
  className: "modal-body"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "field",
  style: {
    gridColumn: '1 / -1'
  }
}, /*#__PURE__*/React.createElement("label", null, "Nombre de campa\xF1a"), /*#__PURE__*/React.createElement("input", {
  placeholder: "Ej. Fondo de construcci\xF3n 2026"
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Meta"), /*#__PURE__*/React.createElement("input", {
  placeholder: "$50,000"
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Fondo asociado"), /*#__PURE__*/React.createElement("select", null, /*#__PURE__*/React.createElement("option", null, "Construcci\xF3n"), /*#__PURE__*/React.createElement("option", null, "Misiones"), /*#__PURE__*/React.createElement("option", null, "General"))), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Fecha de inicio"), /*#__PURE__*/React.createElement("input", {
  type: "date",
  defaultValue: "2026-06-01"
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Fecha de cierre"), /*#__PURE__*/React.createElement("input", {
  type: "date",
  defaultValue: "2026-12-31"
})), /*#__PURE__*/React.createElement("div", {
  className: "field",
  style: {
    gridColumn: '1 / -1'
  }
}, /*#__PURE__*/React.createElement("label", null, "Descripci\xF3n breve ", /*#__PURE__*/React.createElement("span", {
  className: "hint"
}, "(aparecer\xE1 en el portal)")), /*#__PURE__*/React.createElement("textarea", {
  placeholder: "Cu\xE9ntale a tu congregaci\xF3n el prop\xF3sito de esta campa\xF1a..."
})), /*#__PURE__*/React.createElement("div", {
  className: "field",
  style: {
    gridColumn: '1 / -1'
  }
}, /*#__PURE__*/React.createElement("label", null, "Estado inicial"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6
  }
}, /*#__PURE__*/React.createElement("button", {
  className: "chip"
}, "Borrador"), /*#__PURE__*/React.createElement("button", {
  className: "chip active"
}, "Activa"))))), /*#__PURE__*/React.createElement("div", {
  className: "modal-foot"
}, /*#__PURE__*/React.createElement("button", {
  className: "btn btn-ghost",
  onClick: onClose
}, "Cancelar"), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-primary",
  onClick: onCreate
}, /*#__PURE__*/React.createElement(Icon, {
  name: "check",
  size: 14
}), " Crear campa\xF1a"))));
const RegisterDonationModal = ({
  onClose,
  onCreate
}) => /*#__PURE__*/React.createElement("div", {
  className: "modal-overlay",
  onClick: onClose
}, /*#__PURE__*/React.createElement("div", {
  className: "modal modal-lg",
  onClick: e => e.stopPropagation()
}, /*#__PURE__*/React.createElement("div", {
  className: "modal-header"
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Registrar donaci\xF3n"), /*#__PURE__*/React.createElement("p", null, "Para aportes recibidos en efectivo, cheque o por transferencia.")), /*#__PURE__*/React.createElement("button", {
  className: "icon-btn",
  onClick: onClose
}, /*#__PURE__*/React.createElement(Icon, {
  name: "x"
}))), /*#__PURE__*/React.createElement("div", {
  className: "modal-body"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "field",
  style: {
    gridColumn: '1 / -1'
  }
}, /*#__PURE__*/React.createElement("label", null, "Donante"), /*#__PURE__*/React.createElement("div", {
  className: "input-wrap"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "search"
}), /*#__PURE__*/React.createElement("input", {
  className: "input",
  placeholder: "Buscar persona o agregar nueva...",
  defaultValue: "Mar\xEDa Gonz\xE1lez"
}))), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Monto"), /*#__PURE__*/React.createElement("input", {
  placeholder: "$250.00"
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Fecha"), /*#__PURE__*/React.createElement("input", {
  type: "date",
  defaultValue: "2026-05-25"
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Fondo"), /*#__PURE__*/React.createElement("select", null, /*#__PURE__*/React.createElement("option", null, "Fondo General"), /*#__PURE__*/React.createElement("option", null, "Construcci\xF3n"), /*#__PURE__*/React.createElement("option", null, "Misiones 2026"))), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "M\xE9todo"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap'
  }
}, ['Efectivo', 'Cheque', 'ACH', 'Tarjeta'].map((m, i) => /*#__PURE__*/React.createElement("button", {
  key: m,
  className: `chip ${i === 0 ? 'active' : ''}`
}, m)))), /*#__PURE__*/React.createElement("div", {
  className: "field",
  style: {
    gridColumn: '1 / -1'
  }
}, /*#__PURE__*/React.createElement("label", null, "Nota interna ", /*#__PURE__*/React.createElement("span", {
  className: "hint"
}, "(opcional)")), /*#__PURE__*/React.createElement("textarea", {
  placeholder: "Detalle adicional sobre este aporte..."
})), /*#__PURE__*/React.createElement("div", {
  className: "field",
  style: {
    gridColumn: '1 / -1'
  }
}, /*#__PURE__*/React.createElement("label", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("input", {
  type: "checkbox",
  defaultChecked: true
}), " Generar y enviar recibo autom\xE1ticamente")))), /*#__PURE__*/React.createElement("div", {
  className: "modal-foot"
}, /*#__PURE__*/React.createElement("button", {
  className: "btn btn-ghost",
  onClick: onClose
}, "Cancelar"), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-primary",
  onClick: onCreate
}, /*#__PURE__*/React.createElement(Icon, {
  name: "check",
  size: 14
}), " Registrar donaci\xF3n"))));
window.DonacionesScreen = DonacionesScreen;