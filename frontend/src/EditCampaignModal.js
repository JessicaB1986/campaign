import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';

export default function EditCampaignModal({ visible, campaign, onChange, onSave, onCancel }) {
  return (
    <Dialog open={visible} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Campaign</DialogTitle>
      <DialogContent dividers>
        <TextField
          margin="dense"
          label="Name"
          fullWidth
          value={campaign?.name || ''}
          onChange={e => onChange('name', e.target.value)}
        />
        <TextField
          margin="dense"
          label="Image URL"
          fullWidth
          value={campaign?.imageUrl || ''}
          onChange={e => onChange('imageUrl', e.target.value)}
        />
        <TextField
          margin="dense"
          label="Landing URL"
          fullWidth
          value={campaign?.landingUrl || ''}
          onChange={e => onChange('landingUrl', e.target.value)}
        />
        <TextField
          margin="dense"
          label="Status"
          select
          fullWidth
          value={campaign?.status || ''}
          onChange={e => onChange('status', e.target.value)}
        >
          <MenuItem value="1">Active</MenuItem>
          <MenuItem value="0">Paused</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
