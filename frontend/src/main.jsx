import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,NavLink,Link,Navigate,Route,Routes} from 'react-router-dom';
import Icon from './components/Icons';
import VenueList from './pages/VenueList';
import VenueForm from './pages/VenueForm';
import VenueDetail from './pages/VenueDetail';
import './style.css';
function Layout(){return <div className="app"><aside className="sidebar"><Link className="brand" to="/arealy"><span className="brand-symbol"><Icon name="grid" size={18}/></span> PLAY<span>SPOT</span></Link><nav aria-label="Hlavní navigace"><div className="nav-heading">SPRÁVA</div><NavLink to="/arealy" className={({isActive})=>'nav-link '+(isActive?'active':'')}><Icon name="building"/> Areály</NavLink><span className="nav-link disabled"><Icon name="calendar"/> Rezervace <span className="soon">Brzy</span></span><span className="nav-link disabled"><Icon name="user"/> Profil</span></nav><div className="sidebar-footer"><span className="avatar">P</span><div><strong>Provozovatel</strong><small>Demo účet</small></div></div></aside><div className="main"><header className="topbar"><span>Správa sportovních areálů</span><span className="top-user"><span className="avatar small">P</span> Provozovatel</span></header><main className="content"><Routes><Route path="/" element={<Navigate to="/arealy" replace/>}/><Route path="/arealy" element={<VenueList/>}/><Route path="/arealy/novy" element={<VenueForm/>}/><Route path="/arealy/:id" element={<VenueDetail/>}/><Route path="*" element={<Navigate to="/arealy" replace/>}/></Routes></main></div></div>}
createRoot(document.getElementById('root')).render(<BrowserRouter><Layout/></BrowserRouter>);
