import { Spinner, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '24rem',
    padding: tokens.spacingHorizontalXXL,
  },
});

export function PageSpinner() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Spinner label="Loading…" />
    </div>
  );
}
