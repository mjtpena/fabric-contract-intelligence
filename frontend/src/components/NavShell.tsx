import {
  Body1Strong,
  Nav,
  NavDivider,
  NavDrawer,
  NavDrawerBody,
  NavDrawerHeader,
  NavItem,
  NavSectionHeader,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  AlertRegular,
  DocumentBulletListRegular,
  HistoryRegular,
  SearchRegular,
  SettingsRegular,
  ShieldCheckmarkRegular,
  SparkleRegular,
} from '@fluentui/react-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import App from '../App';

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    minWidth: 0,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
  },
  logoMark: {
    width: '1.75rem',
    height: '1.75rem',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: tokens.colorNeutralForegroundOnBrand,
  },
});

function getSelectedValue(path: string): string {
  if (path.startsWith('/contracts/runs')) return '/contracts/runs';
  if (path.startsWith('/contracts/ai-suggest')) return '/contracts/ai-suggest';
  if (path.startsWith('/contracts/ai-query')) return '/contracts/ai-query';
  if (path.startsWith('/contracts/policies')) return '/contracts/policies';
  if (path.startsWith('/contracts/alerts')) return '/contracts/alerts';
  if (path.startsWith('/workspace/settings')) return '/workspace/settings';
  return '/contracts';
}

export function NavShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const styles = useStyles();
  const selectedValue = getSelectedValue(pathname);

  return (
    <div className={styles.shell}>
      <NavDrawer open type="inline" size="small">
        <NavDrawerHeader>
          <div className={styles.brand}>
            <div className={styles.logoMark}>
              <ShieldCheckmarkRegular fontSize={16} />
            </div>
            <Body1Strong>Orqentis</Body1Strong>
          </div>
        </NavDrawerHeader>

        <NavDrawerBody>
          <Nav
            selectedValue={selectedValue}
            onNavItemSelect={(_, data) => {
              navigate(String(data.value));
            }}
          >
            <NavSectionHeader>Contracts</NavSectionHeader>
            <NavItem icon={<DocumentBulletListRegular fontSize={20} />} value="/contracts">
              Contracts
            </NavItem>
            <NavItem icon={<HistoryRegular fontSize={20} />} value="/contracts/runs">
              Runs
            </NavItem>
            <NavItem icon={<ShieldCheckmarkRegular fontSize={20} />} value="/contracts/policies">
              Policies
            </NavItem>
            <NavItem icon={<SparkleRegular fontSize={20} />} value="/contracts/ai-suggest">
              AI Suggest
            </NavItem>
            <NavItem icon={<SearchRegular fontSize={20} />} value="/contracts/ai-query">
              Ask in English
            </NavItem>
            <NavDivider />
            <NavSectionHeader>Monitoring</NavSectionHeader>
            <NavItem icon={<AlertRegular fontSize={20} />} value="/contracts/alerts">
              Alerts
            </NavItem>
            <NavDivider />
            <NavItem icon={<SettingsRegular fontSize={20} />} value="/workspace/settings">
              Settings
            </NavItem>
          </Nav>
        </NavDrawerBody>
      </NavDrawer>

      <div className={styles.content}>
        <App />
      </div>
    </div>
  );
}
