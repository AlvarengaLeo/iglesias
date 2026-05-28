/* global React, Icon, Badge, formatMoney */
// Personas screen

const {
  useState: useStateP
} = React;
const PEOPLE = [{
  id: 1,
  name: 'María González Pérez',
  initials: 'MG',
  phone: '(305) 555-0142',
  email: 'maria.gonzalez@gmail.com',
  type: 'Miembro',
  tone: 'navy',
  lastActivity: 'Donación · hace 2 días',
  tags: ['Diezmo recurrente', 'Coro'],
  totalYear: 3200,
  recurring: true,
  follow: 'Visita pastoral · 15 jun'
}, {
  id: 2,
  name: 'Carlos Méndez',
  initials: 'CM',
  phone: '(786) 555-0188',
  email: 'cmendez@correo.com',
  type: 'Donante',
  tone: 'coffee',
  lastActivity: 'Donación · hace 5 días',
  tags: ['Mensual'],
  totalYear: 1850,
  recurring: true
}, {
  id: 3,
  name: 'Ana Torres Ramírez',
  initials: 'AT',
  phone: '(305) 555-0199',
  email: 'ana.t@yahoo.com',
  type: 'Servidor',
  tone: 'success',
  lastActivity: 'Reunión · hace 1 día',
  tags: ['Niños', 'Líder'],
  totalYear: 1200,
  recurring: false
}, {
  id: 4,
  name: 'Familia Ramírez',
  initials: 'FR',
  phone: '(305) 555-0210',
  email: 'ramirez.familia@gmail.com',
  type: 'Visitante',
  tone: 'info',
  lastActivity: 'Primera visita · 2 mar',
  tags: ['Nuevos'],
  totalYear: 0,
  recurring: false
}, {
  id: 5,
  name: 'José Antonio Vargas',
  initials: 'JV',
  phone: '(786) 555-0233',
  email: 'jvargas@hotmail.com',
  type: 'Miembro',
  tone: 'navy',
  lastActivity: 'Donación · hace 1 semana',
  tags: ['Misiones'],
  totalYear: 980,
  recurring: false
}, {
  id: 6,
  name: 'Lucía Hernández',
  initials: 'LH',
  phone: '(305) 555-0277',
  email: 'lucia.h@gmail.com',
  type: 'Donante',
  tone: 'coffee',
  lastActivity: 'Donación · hace 3 días',
  tags: ['Anual'],
  totalYear: 5400,
  recurring: true
}, {
  id: 7,
  name: 'Pedro Castillo',
  initials: 'PC',
  phone: '(786) 555-0301',
  email: 'p.castillo@correo.com',
  type: 'Servidor',
  tone: 'success',
  lastActivity: 'Reunión · hace 4 días',
  tags: ['Alabanza'],
  totalYear: 720,
  recurring: false
}, {
  id: 8,
  name: 'Roberto Salinas',
  initials: 'RS',
  phone: '(305) 555-0322',
  email: 'rsalinas@gmail.com',
  type: 'Inactivo',
  tone: 'muted',
  lastActivity: 'Sin actividad · 6 meses',
  tags: [],
  totalYear: 0,
  recurring: false
}, {
  id: 9,
  name: 'Familia Ortega',
  initials: 'FO',
  phone: '(786) 555-0344',
  email: 'ortega.f@correo.com',
  type: 'Miembro',
  tone: 'navy',
  lastActivity: 'Donación · hace 6 días',
  tags: ['Diezmo recurrente', 'Familia'],
  totalYear: 4100,
  recurring: true
}, {
  id: 10,
  name: 'Sofía Mendoza',
  initials: 'SM',
  phone: '(305) 555-0359',
  email: 'sofiam@gmail.com',
  type: 'Visitante',
  tone: 'info',
  lastActivity: 'Visita · hace 10 días',
  tags: ['Joven'],
  totalYear: 50,
  recurring: false
}];
const PersonasScreen = ({
  onToast
}) => {
  const [filter, setFilter] = useStateP('Todos');
  const [search, setSearch] = useStateP('');
  const [selected, setSelected] = useStateP(null);
  const [showAddModal, setShowAddModal] = useStateP(false);
  const [profileTab, setProfileTab] = useStateP('Resumen');
  const counts = {
    Todos: PEOPLE.length,
    Miembros: PEOPLE.filter(p => p.type === 'Miembro').length,
    Visitantes: PEOPLE.filter(p => p.type === 'Visitante').length,
    Donantes: PEOPLE.filter(p => p.type === 'Donante').length,
    Servidores: PEOPLE.filter(p => p.type === 'Servidor').length,
    Inactivos: PEOPLE.filter(p => p.type === 'Inactivo').length
  };
  const filtered = PEOPLE.filter(p => {
    if (filter !== 'Todos' && p.type !== filter.replace(/s$/, '')) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const filters = ['Todos', 'Miembros', 'Visitantes', 'Donantes', 'Servidores', 'Inactivos'];
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header-text"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "page-greeting"
  }, "Personas"), /*#__PURE__*/React.createElement("p", {
    className: "page-sub"
  }, "Administra miembros, visitantes, donantes y servidores \xB7 ", PEOPLE.length, " personas registradas")), /*#__PURE__*/React.createElement("div", {
    className: "page-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 14
  }), " Exportar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setShowAddModal(true)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " Agregar persona"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16,
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "input-wrap",
    style: {
      flex: '1 1 280px',
      minWidth: 240
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search"
  }), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "Buscar por nombre, tel\xE9fono o email",
    value: search,
    onChange: e => setSearch(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, filters.map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    className: `chip ${filter === f ? 'active' : ''}`,
    onClick: () => setFilter(f)
  }, f, " ", /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, counts[f])))), /*#__PURE__*/React.createElement("button", {
    className: "pill-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "filter"
  }), " Etiquetas ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown"
  })))), /*#__PURE__*/React.createElement("div", {
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
  })), /*#__PURE__*/React.createElement("th", null, "Nombre"), /*#__PURE__*/React.createElement("th", null, "Tel\xE9fono"), /*#__PURE__*/React.createElement("th", null, "Email"), /*#__PURE__*/React.createElement("th", null, "Tipo"), /*#__PURE__*/React.createElement("th", null, "\xDAltima actividad"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: 120,
      textAlign: 'right'
    }
  }, "Acciones"))), /*#__PURE__*/React.createElement("tbody", null, filtered.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    className: selected?.id === p.id ? 'selected' : '',
    onClick: () => setSelected(p)
  }, /*#__PURE__*/React.createElement("td", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox"
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "person-cell"
  }, /*#__PURE__*/React.createElement("div", {
    className: `avatar ${p.tone === 'coffee' ? 'coffee' : p.tone === 'navy' ? 'navy' : ''}`
  }, p.initials), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, p.tags.slice(0, 2).join(' · ') || '—')))), /*#__PURE__*/React.createElement("td", {
    className: "muted tnum"
  }, p.phone), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, p.email), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(PersonBadge, {
    type: p.type
  })), /*#__PURE__*/React.createElement("td", {
    className: "muted",
    style: {
      fontSize: 12
    }
  }, p.lastActivity), /*#__PURE__*/React.createElement("td", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "row-actions",
    style: {
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    title: "Ver perfil",
    onClick: () => setSelected(p)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    title: "Editar"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "edit",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    title: "Enviar mensaje"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 14
  }))))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderTop: '1px solid var(--border-soft)',
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Mostrando 1\u2013", filtered.length, " de ", PEOPLE.length, " personas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary",
    disabled: true
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevronLeft",
    size: 12
  }), " Anterior"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, "Siguiente ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronRight",
    size: 12
  }))))), selected && /*#__PURE__*/React.createElement("div", {
    className: "drawer-overlay",
    onClick: () => setSelected(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "drawer",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "drawer-header"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: `avatar lg ${selected.tone === 'coffee' ? 'coffee' : 'navy'}`
  }, selected.initials), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 4px',
      fontSize: 17,
      fontWeight: 700
    }
  }, selected.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(PersonBadge, {
    type: selected.type
  }), selected.recurring && /*#__PURE__*/React.createElement(Badge, {
    tone: "coffee",
    icon: "refresh"
  }, "Recurrente")))), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => setSelected(null)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tabs-underline"
  }, ['Resumen', 'Donaciones', 'Seguimiento', 'Notas'].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `tab-u ${profileTab === t ? 'active' : ''}`,
    onClick: () => setProfileTab(t)
  }, t)))), /*#__PURE__*/React.createElement("div", {
    className: "drawer-body"
  }, profileTab === 'Resumen' && /*#__PURE__*/React.createElement(ProfileResumen, {
    p: selected
  }), profileTab === 'Donaciones' && /*#__PURE__*/React.createElement(ProfileDonaciones, {
    p: selected
  }), profileTab === 'Seguimiento' && /*#__PURE__*/React.createElement(ProfileSeguimiento, {
    p: selected
  }), profileTab === 'Notas' && /*#__PURE__*/React.createElement(ProfileNotas, {
    p: selected
  })), /*#__PURE__*/React.createElement("div", {
    className: "drawer-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 14
  }), " Enviar mensaje"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "edit",
    size: 14
  }), " Editar persona")))), showAddModal && /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: () => setShowAddModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Agregar persona"), /*#__PURE__*/React.createElement("p", null, "Captura la informaci\xF3n esencial. Podr\xE1s completar el perfil despu\xE9s.")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => setShowAddModal(false)
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
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Nombre"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Mar\xEDa"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Apellido"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Gonz\xE1lez"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Tel\xE9fono"), /*#__PURE__*/React.createElement("input", {
    placeholder: "(305) 555-0000"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Email"), /*#__PURE__*/React.createElement("input", {
    placeholder: "email@ejemplo.com"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field",
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement("label", null, "Tipo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, ['Miembro', 'Visitante', 'Donante', 'Servidor'].map((t, i) => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `chip ${i === 0 ? 'active' : ''}`
  }, t)))), /*#__PURE__*/React.createElement("div", {
    className: "field",
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement("label", null, "Notas ", /*#__PURE__*/React.createElement("span", {
    className: "hint"
  }, "(opcional)")), /*#__PURE__*/React.createElement("textarea", {
    placeholder: "Observaciones pastorales, contexto familiar, etc."
  })))), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setShowAddModal(false)
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => {
      setShowAddModal(false);
      onToast({
        title: 'Persona agregada correctamente',
        sub: 'Aparecerá en tu lista de personas.'
      });
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), " Guardar persona")))));
};
const PersonBadge = ({
  type
}) => {
  const map = {
    Miembro: {
      tone: 'navy',
      icon: null
    },
    Visitante: {
      tone: 'info',
      icon: null
    },
    Donante: {
      tone: 'coffee',
      icon: null
    },
    Servidor: {
      tone: 'success',
      icon: null
    },
    Inactivo: {
      tone: 'muted',
      icon: null
    }
  };
  const m = map[type] || {
    tone: 'muted'
  };
  return /*#__PURE__*/React.createElement(Badge, {
    tone: m.tone,
    dot: true
  }, type);
};
const ProfileResumen = ({
  p
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  }
}, /*#__PURE__*/React.createElement(Section, {
  title: "Contacto"
}, /*#__PURE__*/React.createElement(InfoRow, {
  icon: "phone",
  label: "Tel\xE9fono",
  value: p.phone
}), /*#__PURE__*/React.createElement(InfoRow, {
  icon: "mail",
  label: "Email",
  value: p.email
}), /*#__PURE__*/React.createElement(InfoRow, {
  icon: "map",
  label: "Direcci\xF3n",
  value: "2310 SW 27th Ave, Miami FL 33145"
})), /*#__PURE__*/React.createElement(Section, {
  title: "Etiquetas"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6
  }
}, p.tags.length ? p.tags.map(t => /*#__PURE__*/React.createElement(Badge, {
  key: t,
  tone: "coffee"
}, t)) : /*#__PURE__*/React.createElement("span", {
  className: "muted",
  style: {
    fontSize: 12
  }
}, "Sin etiquetas"), /*#__PURE__*/React.createElement("button", {
  className: "chip",
  style: {
    padding: '4px 10px'
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "plus",
  size: 11
}), " Agregar"))), /*#__PURE__*/React.createElement(Section, {
  title: "Familia"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  }
}, /*#__PURE__*/React.createElement(FamilyRow, {
  name: "Jos\xE9 Gonz\xE1lez",
  rel: "Esposo",
  type: "Miembro"
}), /*#__PURE__*/React.createElement(FamilyRow, {
  name: "Daniel Gonz\xE1lez",
  rel: "Hijo",
  type: "Servidor"
}), /*#__PURE__*/React.createElement(FamilyRow, {
  name: "Luc\xEDa Gonz\xE1lez",
  rel: "Hija",
  type: "Visitante"
}))), /*#__PURE__*/React.createElement(Section, {
  title: "Resumen de donaciones"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  }
}, /*#__PURE__*/React.createElement(MiniStat, {
  label: "Total donado este a\xF1o",
  value: formatMoney(p.totalYear)
}), /*#__PURE__*/React.createElement(MiniStat, {
  label: "\xDAltima donaci\xF3n",
  value: "$250 \xB7 hace 2 d\xEDas"
}), /*#__PURE__*/React.createElement(MiniStat, {
  label: "Donaci\xF3n recurrente",
  value: p.recurring ? 'Activa · $200/mes' : 'No activa',
  success: p.recurring
}), /*#__PURE__*/React.createElement(MiniStat, {
  label: "Recibos enviados",
  value: "14"
}))), /*#__PURE__*/React.createElement(Section, {
  title: "Seguimiento"
}, /*#__PURE__*/React.createElement(InfoRow, {
  icon: "clock",
  label: "\xDAltimo contacto",
  value: "Visita pastoral \xB7 12 mayo"
}), /*#__PURE__*/React.createElement(InfoRow, {
  icon: "calendar",
  label: "Pr\xF3ximo seguimiento",
  value: "15 junio \xB7 Visita programada",
  highlight: true
})));
const ProfileDonaciones = ({
  p
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  }
}, /*#__PURE__*/React.createElement(MiniStat, {
  label: "Total este a\xF1o",
  value: formatMoney(p.totalYear)
}), /*#__PURE__*/React.createElement(MiniStat, {
  label: "Promedio mensual",
  value: formatMoney(Math.round(p.totalYear / 8))
})), /*#__PURE__*/React.createElement(Section, {
  title: "Historial"
}, [{
  date: '23 may 2026',
  amount: 250,
  fund: 'Fondo General',
  method: 'ACH',
  status: 'Pagada'
}, {
  date: '23 abr 2026',
  amount: 250,
  fund: 'Fondo General',
  method: 'ACH',
  status: 'Pagada'
}, {
  date: '15 abr 2026',
  amount: 100,
  fund: 'Misiones 2026',
  method: 'Tarjeta',
  status: 'Pagada'
}, {
  date: '23 mar 2026',
  amount: 250,
  fund: 'Fondo General',
  method: 'ACH',
  status: 'Pagada'
}, {
  date: '23 feb 2026',
  amount: 200,
  fund: 'Fondo General',
  method: 'ACH',
  status: 'Pagada'
}].map((d, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-soft)'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600,
    fontSize: 13
  }
}, formatMoney(d.amount), " \xB7 ", d.fund), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)'
  }
}, d.date, " \xB7 ", d.method)), /*#__PURE__*/React.createElement(Badge, {
  tone: "success",
  dot: true
}, d.status)))));
const ProfileSeguimiento = ({
  p
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "banner info"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "info"
}), "Pr\xF3ximo seguimiento: ", /*#__PURE__*/React.createElement("strong", null, "Visita pastoral programada para el 15 de junio")), /*#__PURE__*/React.createElement(Section, {
  title: "Historial pastoral"
}, /*#__PURE__*/React.createElement(Timeline, {
  items: [{
    icon: 'phone',
    text: 'Llamada de seguimiento — María compartió motivos de oración por su hijo.',
    time: '12 may 2026',
    tone: 'coffee'
  }, {
    icon: 'user',
    text: 'Visita pastoral en casa — Familia recibió oración y palabras de aliento.',
    time: '20 abr 2026',
    tone: 'navy'
  }, {
    icon: 'mail',
    text: 'Envío de recurso devocional «Caminar con Cristo».',
    time: '14 mar 2026',
    tone: 'success'
  }]
})));
const ProfileNotas = ({
  p
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "banner"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "lock"
}), "Las notas pastorales son privadas y solo visibles para administradores y pastores."), /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'var(--bg)',
    padding: 14,
    borderRadius: 12,
    border: '1px solid var(--border-soft)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: 6
  }
}, "Nota \xB7 Pastor Miguel \xB7 12 may 2026"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    lineHeight: 1.55
  }
}, "Familia muy comprometida con el ministerio de ni\xF1os. Mar\xEDa est\xE1 liderando el grupo de oraci\xF3n de las mujeres. Solicitar oraci\xF3n por la salud de su madre.")), /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'var(--bg)',
    padding: 14,
    borderRadius: 12,
    border: '1px solid var(--border-soft)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: 6
  }
}, "Nota \xB7 Pastora Elena \xB7 28 mar 2026"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    lineHeight: 1.55
  }
}, "Daniel (hijo) participar\xE1 en el campamento juvenil de verano. Confirmar inscripci\xF3n.")), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-secondary",
  style: {
    alignSelf: 'flex-start'
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "plus",
  size: 14
}), " Agregar nota"));
const Section = ({
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
}, title), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }
}, children));
const InfoRow = ({
  icon,
  label,
  value,
  highlight
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: highlight ? 'var(--coffee-bg)' : 'var(--bg-2)',
    color: highlight ? 'var(--coffee)' : 'var(--muted)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: icon,
  size: 14
})), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    minWidth: 0
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)'
  }
}, label), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    fontWeight: 500
  }
}, value)));
const FamilyRow = ({
  name,
  rel,
  type
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 8px',
    borderRadius: 8,
    background: 'var(--bg)'
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "avatar sm"
}, name.split(' ').map(n => n[0]).join('').slice(0, 2)), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    fontWeight: 500
  }
}, name), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)'
  }
}, rel)), /*#__PURE__*/React.createElement(PersonBadge, {
  type: type
}));
const MiniStat = ({
  label,
  value,
  success
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 12,
    borderRadius: 10,
    background: 'var(--bg)',
    border: '1px solid var(--border-soft)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: 4
  }
}, label), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    fontWeight: 700,
    color: success ? 'var(--success)' : 'var(--text)'
  }
}, value));
const Timeline = ({
  items
}) => /*#__PURE__*/React.createElement("div", {
  className: "timeline"
}, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  className: "timeline-item"
}, /*#__PURE__*/React.createElement("div", {
  className: `timeline-dot ${it.tone || 'coffee'}`
}, /*#__PURE__*/React.createElement(Icon, {
  name: it.icon
})), /*#__PURE__*/React.createElement("div", {
  className: "timeline-body"
}, /*#__PURE__*/React.createElement("p", null, it.text), /*#__PURE__*/React.createElement("span", null, it.time)))));
window.PersonasScreen = PersonasScreen;