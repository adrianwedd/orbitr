import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrackControls } from '@/components/TrackControls'
import { Track } from '@/lib/types'

const mockTracks: Track[] = [
  {
    id: 'track1',
    name: 'O',
    radius: 180,
    color: '#ef4444',
    volume: 0.8,
    muted: false,
    solo: false,
    steps: []
  },
  {
    id: 'track2',
    name: 'R',
    radius: 150,
    color: '#3b82f6',
    volume: 0.6,
    muted: true,
    solo: false,
    steps: []
  },
  {
    id: 'track3',
    name: 'B',
    radius: 120,
    color: '#10b981',
    volume: 0.9,
    muted: false,
    solo: true,
    steps: []
  }
]

describe('TrackControls Component', () => {
  const defaultProps = {
    tracks: mockTracks,
    selectedTrack: 'track1',
    onSelectTrack: jest.fn(),
    onVolumeChange: jest.fn(),
    onMuteToggle: jest.fn(),
    onSoloToggle: jest.fn(),
    onClearTrack: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Track Selection UI', () => {
    it('should render vertical ORBITR track buttons', () => {
      render(<TrackControls {...defaultProps} />)
      
      expect(screen.getByText('O')).toBeInTheDocument()
      expect(screen.getByText('R')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
    })

    it('should highlight selected track', () => {
      render(<TrackControls {...defaultProps} />)
      
      const selectedButton = screen.getByText('O').closest('button')
      expect(selectedButton).toHaveClass('ring-2', 'ring-blue-400', 'scale-110')
    })

    it('should show muted track with reduced opacity', () => {
      render(<TrackControls {...defaultProps} />)
      
      const mutedButton = screen.getByText('R').closest('button')
      expect(mutedButton).toHaveClass('opacity-50')
    })

    it('should show solo track with yellow ring', () => {
      render(<TrackControls {...defaultProps} />)
      
      const soloButton = screen.getByText('B').closest('button')
      expect(soloButton).toHaveClass('ring-2', 'ring-yellow-400')
    })

    it('should call onSelectTrack when track button clicked', () => {
      render(<TrackControls {...defaultProps} />)
      
      fireEvent.click(screen.getByText('R'))
      expect(defaultProps.onSelectTrack).toHaveBeenCalledWith('track2')
    })
  })

  describe('Track Controls UI', () => {
    it('should show controls for selected track', () => {
      render(<TrackControls {...defaultProps} />)
      
      expect(screen.getByText('Track O')).toBeInTheDocument()
      expect(screen.getByLabelText('Volume')).toBeInTheDocument()
      expect(screen.getByText('MUTE')).toBeInTheDocument()
      expect(screen.getByText('SOLO')).toBeInTheDocument()
      expect(screen.getByText('Clear Track')).toBeInTheDocument()
    })

    it('should not show controls when no track selected', () => {
      render(<TrackControls {...defaultProps} selectedTrack={null} />)
      
      expect(screen.queryByText('Track O')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Volume')).not.toBeInTheDocument()
    })

    it('should display correct volume percentage', () => {
      render(<TrackControls {...defaultProps} />)
      
      expect(screen.getByText('80%')).toBeInTheDocument() // track1 volume is 0.8
    })

    it('should call onVolumeChange when volume slider moved', () => {
      render(<TrackControls {...defaultProps} />)
      
      const volumeSlider = screen.getByLabelText('Volume')
      fireEvent.change(volumeSlider, { target: { value: '0.5' } })
      
      expect(defaultProps.onVolumeChange).toHaveBeenCalledWith('track1', 0.5)
    })

    it('should highlight mute button when track is muted', () => {
      render(<TrackControls {...defaultProps} selectedTrack="track2" />)
      
      const muteButton = screen.getByText('MUTE')
      expect(muteButton).toHaveClass('bg-red-600', 'text-white')
    })

    it('should highlight solo button when track is solo', () => {
      render(<TrackControls {...defaultProps} selectedTrack="track3" />)
      
      const soloButton = screen.getByText('SOLO')
      expect(soloButton).toHaveClass('bg-yellow-600', 'text-black')
    })

    it('should call onMuteToggle when mute button clicked', () => {
      render(<TrackControls {...defaultProps} />)
      
      fireEvent.click(screen.getByText('MUTE'))
      expect(defaultProps.onMuteToggle).toHaveBeenCalledWith('track1')
    })

    it('should call onSoloToggle when solo button clicked', () => {
      render(<TrackControls {...defaultProps} />)
      
      fireEvent.click(screen.getByText('SOLO'))
      expect(defaultProps.onSoloToggle).toHaveBeenCalledWith('track1')
    })

    it('should call onClearTrack when clear button clicked', () => {
      render(<TrackControls {...defaultProps} />)
      
      fireEvent.click(screen.getByText('Clear Track'))
      expect(defaultProps.onClearTrack).toHaveBeenCalledWith('track1')
    })
  })

  describe('Track Color Display', () => {
    it('should apply track color as background', () => {
      render(<TrackControls {...defaultProps} />)
      
      const trackButton = screen.getByText('O').closest('button')
      expect(trackButton).toHaveStyle({ backgroundColor: '#ef4444' })
    })

    it('should use dark text for yellow track', () => {
      const yellowTrack = {
        ...mockTracks[0],
        color: '#f59e0b',
        name: 'Y'
      }
      
      render(<TrackControls 
        {...defaultProps} 
        tracks={[yellowTrack]}
        selectedTrack={yellowTrack.id}
      />)
      
      const trackButton = screen.getByText('Y').closest('button')
      expect(trackButton).toHaveStyle({ color: '#000' })
    })

    it('should show track color indicator in controls', () => {
      render(<TrackControls {...defaultProps} />)
      
      const colorIndicator = document.querySelector('[style*="background-color: rgb(239, 68, 68)"]')
      expect(colorIndicator).toBeInTheDocument()
    })
  })
})