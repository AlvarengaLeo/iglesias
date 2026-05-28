/* global React, Icon, LineChart, BarChart, DonutChart, formatMoney, Badge */
// Inicio / Dashboard screen

const {
  useState: useStateI
} = React;
const InicioScreen = ({
  onToast,
  onAction
}) => {
  const monthlyData = [{
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
    value: 7100
  }, {
    label: 'Jun',
    value: 8200
  }, {
    label: 'Jul',
    value: 7600
  }, {
    label: 'Ago',
    value: 8450
  }];
  const fundData = [{
    label: 'General',
    value: 4900
  }, {
    label: 'Construc.',
    value: 1850
  }, {
    label: 'Misiones',
    value: 920
  }, {
    label: 'Jóvenes',
    value: 480
  }, {
    label: 'Ayuda',
    value: 300
  }];
  const typeData = [{
    label: 'Diezmo',
    value: 5100,
    color: '#1F2B38'
  }, {
    label: 'Ofrenda',
    value: 1820,
    color: '#8A6A4A'
  }, {
    label: 'Campaña',
    value: 1130,
    color: '#B89A7A'
  }, {
    label: 'Misiones',
    value: 400,
    color: '#5C7CB0'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header-text"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "page-greeting"
  }, "Bienvenido, Iglesia Casa de Restauraci\xF3n"), /*#__PURE__*/React.createElement("p", {
    className: "page-sub"
  }, "Resumen general de actividad, donaciones y portal \xB7 Domingo, 25 de mayo")), /*#__PURE__*/React.createElement("div", {
    className: "page-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary",
    onClick: () => onAction?.('persona')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 14
  }), " Agregar persona"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary",
    onClick: () => onAction?.('publicar')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "upload",
    size: 14
  }), " Publicar cambios"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => onAction?.('donacion')
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
  }), " Donaciones del mes"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "$8,450"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kpi-trend up"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrowUp",
    size: 10
  }), " +12%"), "vs mes anterior")), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "refresh"
  }), " Donantes recurrentes"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "48"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kpi-trend up"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrowUp",
    size: 10
  }), " +6"), "nuevos este mes")), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "target"
  }), " Campa\xF1as activas"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "3"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "warning",
    dot: true
  }, "1 cerca de su meta"))), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-label"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "receipt"
  }), " Recibos enviados"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-value"
  }, "126"), /*#__PURE__*/React.createElement("div", {
    className: "kpi-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "muted"
  }, "8 reenviados este mes")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-12",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card col-span-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Tendencia mensual de donaciones"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "\xDAltimos 8 meses \xB7 Total recibido")), /*#__PURE__*/React.createElement("div", {
    className: "card-header-actions"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tab"
  }, "3M"), /*#__PURE__*/React.createElement("button", {
    className: "tab active"
  }, "8M"), /*#__PURE__*/React.createElement("button", {
    className: "tab"
  }, "1A")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: monthlyData,
    height: 240,
    accent: "#8A6A4A",
    selectedIndex: 5
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card col-span-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", null, "Distribuci\xF3n por tipo"), /*#__PURE__*/React.createElement("button", {
    className: "btn-ghost btn btn-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "moreH"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement(DonutChart, {
    data: typeData,
    size: 140,
    label: "Este mes"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-12",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card col-span-7"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", null, "Donaciones por fondo"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "Mes actual")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(BarChart, {
    data: fundData,
    height: 220,
    accent: "#1F2B38",
    highlightIndex: 0
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card col-span-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", null, "Actividad reciente"), /*#__PURE__*/React.createElement("a", {
    className: "subtle-link"
  }, "Ver todo")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "timeline"
  }, /*#__PURE__*/React.createElement(ActivityItem, {
    icon: "handHeart",
    tone: "coffee",
    text: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, "Mar\xEDa Gonz\xE1lez"), " don\xF3 $250 al Fondo General"),
    time: "hace 12 minutos"
  }), /*#__PURE__*/React.createElement(ActivityItem, {
    icon: "receipt",
    tone: "success",
    text: /*#__PURE__*/React.createElement(React.Fragment, null, "Recibo #2024-126 enviado a ", /*#__PURE__*/React.createElement("strong", null, "Carlos M\xE9ndez")),
    time: "hace 1 hora"
  }), /*#__PURE__*/React.createElement(ActivityItem, {
    icon: "users",
    tone: "navy",
    text: /*#__PURE__*/React.createElement(React.Fragment, null, "Nueva persona registrada: ", /*#__PURE__*/React.createElement("strong", null, "Familia Ram\xEDrez")),
    time: "hace 3 horas"
  }), /*#__PURE__*/React.createElement(ActivityItem, {
    icon: "upload",
    tone: "warning",
    text: /*#__PURE__*/React.createElement(React.Fragment, null, "Cambios publicados en el ", /*#__PURE__*/React.createElement("strong", null, "portal p\xFAblico")),
    time: "hace 5 horas"
  }), /*#__PURE__*/React.createElement(ActivityItem, {
    icon: "handHeart",
    tone: "coffee",
    text: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, "Jos\xE9 Antonio"), " don\xF3 $100 a Misiones 2026"),
    time: "ayer \xB7 18:42"
  }), /*#__PURE__*/React.createElement(ActivityItem, {
    icon: "refresh",
    tone: "navy",
    text: /*#__PURE__*/React.createElement(React.Fragment, null, "Recibo reenviado a ", /*#__PURE__*/React.createElement("strong", null, "Ana Torres"), " \u2014 Cambio de correo"),
    time: "ayer \xB7 14:10"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card col-span-7"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", null, "Campa\xF1as activas"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " Crear campa\xF1a")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(CampaignCard, {
    name: "Fondo de construcci\xF3n",
    goal: 50000,
    raised: 32400,
    progress: 0.648,
    status: "active",
    note: "6 meses restantes"
  }), /*#__PURE__*/React.createElement(CampaignCard, {
    name: "Misiones 2026",
    goal: 12000,
    raised: 11200,
    progress: 0.93,
    status: "nearGoal",
    note: "Cerca de su meta"
  }), /*#__PURE__*/React.createElement(CampaignCard, {
    name: "Ayuda comunitaria",
    goal: 5000,
    raised: 1280,
    progress: 0.256,
    status: "active",
    note: "Reci\xE9n iniciada"
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      border: '1.5px dashed var(--border)',
      background: 'var(--bg)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      color: 'var(--muted)',
      fontWeight: 600,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus"
  }), "Nueva campa\xF1a"))), /*#__PURE__*/React.createElement("div", {
    className: "card col-span-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", null, "Acciones pendientes"), /*#__PURE__*/React.createElement(Badge, {
    tone: "warning"
  }, "4 por completar")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "checklist"
  }, /*#__PURE__*/React.createElement(CheckItem, {
    done: false,
    label: "Conectar Stripe",
    meta: "Requerido para recibir donaciones en l\xEDnea",
    action: "Conectar"
  }), /*#__PURE__*/React.createElement(CheckItem, {
    done: false,
    label: "Completar datos fiscales",
    meta: "EIN y representante autorizado"
  }), /*#__PURE__*/React.createElement(CheckItem, {
    done: false,
    label: "Publicar portal",
    meta: "3 cambios sin publicar"
  }), /*#__PURE__*/React.createElement(CheckItem, {
    done: false,
    label: "Revisar recibos pendientes",
    meta: "2 recibos fallidos esta semana"
  }), /*#__PURE__*/React.createElement(CheckItem, {
    done: true,
    label: "Invitar al tesorero",
    meta: "Completado hace 2 d\xEDas"
  }))))));
};
const ActivityItem = ({
  icon,
  tone = 'coffee',
  text,
  time
}) => /*#__PURE__*/React.createElement("div", {
  className: "timeline-item"
}, /*#__PURE__*/React.createElement("div", {
  className: `timeline-dot ${tone}`
}, /*#__PURE__*/React.createElement(Icon, {
  name: icon
})), /*#__PURE__*/React.createElement("div", {
  className: "timeline-body"
}, /*#__PURE__*/React.createElement("p", null, text), /*#__PURE__*/React.createElement("span", null, time)));
const CampaignCard = ({
  name,
  goal,
  raised,
  progress,
  status,
  note
}) => /*#__PURE__*/React.createElement("div", {
  className: "campaign-card"
}, /*#__PURE__*/React.createElement("div", {
  className: "campaign-head"
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "campaign-name"
}, name), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)',
    marginTop: 2
  }
}, "Meta \xB7 ", formatMoney(goal))), status === 'nearGoal' ? /*#__PURE__*/React.createElement(Badge, {
  tone: "warning",
  dot: true
}, "Cerca de meta") : /*#__PURE__*/React.createElement(Badge, {
  tone: "success",
  dot: true
}, "Activa")), /*#__PURE__*/React.createElement("div", {
  className: "campaign-money"
}, /*#__PURE__*/React.createElement("span", {
  className: "raised"
}, formatMoney(raised)), /*#__PURE__*/React.createElement("span", {
  className: "goal"
}, "recaudados \xB7 ", Math.round(progress * 100), "%")), /*#__PURE__*/React.createElement("div", {
  className: "progress thick"
}, /*#__PURE__*/React.createElement("div", {
  className: "progress-bar",
  style: {
    width: `${progress * 100}%`,
    background: status === 'nearGoal' ? 'var(--success)' : 'var(--coffee)'
  }
})), /*#__PURE__*/React.createElement("div", {
  className: "campaign-foot"
}, /*#__PURE__*/React.createElement("span", null, note), /*#__PURE__*/React.createElement("a", {
  className: "subtle-link"
}, "Ver campa\xF1a \u2192")));
const CheckItem = ({
  done,
  label,
  meta,
  action
}) => /*#__PURE__*/React.createElement("div", {
  className: `check-item ${done ? 'done' : ''}`
}, /*#__PURE__*/React.createElement("div", {
  className: `check-box ${done ? 'done' : ''}`
}, done && /*#__PURE__*/React.createElement(Icon, {
  name: "check",
  size: 11
})), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    minWidth: 0
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "label"
}, label), /*#__PURE__*/React.createElement("div", {
  className: "meta"
}, meta)), !done && action && /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-coffee"
}, action));
window.InicioScreen = InicioScreen;